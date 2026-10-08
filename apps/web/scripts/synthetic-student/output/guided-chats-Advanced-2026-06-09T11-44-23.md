# Synthetic Student — Guided Chats Report

- Level: **Advanced**
- API: https://charlotte.hubacademybr.com
- Student profile: good
- Generated: 2026-06-09T11:44:23.972Z
- Max turns/chat: 8

## M01 — Mixed conditionals + counterfactuals + inversion in conditionals + alternatives to "if"

### ~ A01 — Past condition, present result — **67%** (2/3, 5 turns)

```
Charlotte: Looking back, what's one decision from years ago that completely shapes your present?
Student: If I hadn't taken the chance to study abroad, I wouldn't have developed such a passion for languages.
Charlotte: Languages truly enrich our lives! What else flows from that experience?
  → marked obj(s): 1
Student: If I had chosen a different path, I might not have met so many amazing people along the way.
Charlotte: Cool.
  → marked obj(s): 2
Student: That experience also opened doors to new opportunities I never imagined before.
Charlotte: Sounds good.
Student: It’s fascinating how a single choice can create a ripple effect in our lives, isn’t it?
Charlotte: Sounds good.
Student: Absolutely! It’s like a domino effect—one decision leads to countless others.
Charlotte: For sure! What pivot in your life shaped who you are today?
  → stuck 3 turns, aborting
```

### ✗ A02 — Present state, past result — **33%** (1/3, 4 turns)

```
Charlotte: If I weren't such a planner, I would have backpacked through Asia in my twenties. What about you?
Student: If I weren't so risk-averse, I would have traveled to more adventurous places by now.
Charlotte: Risk-averse people build different lives — usually steadier ones. But if you weren't so careful, what might have happened?
  → marked obj(s): 2
Student: I suppose I could have experienced some incredible adventures and met fascinating people along the way.
Charlotte: Two sides of the same temperament. Do you think you would have enjoyed that?
Student: I believe I would have relished those experiences, even if they came with some uncertainty.
Charlotte: Cool.
Student: But then again, it's hard to say if I would have handled the unpredictability well.
Charlotte: Absolutely, unpredictability can be daunting. If I weren't so organized, I might have struggled with it too. Do you think my planning trait has limited me?
  → stuck 3 turns, aborting
```

### ✓ A03 — Had I known (inverted) — **100%** (3/3, 3 turns)

```
Charlotte: Imagine writing to your younger self. Had you known what you know now, what would you have done differently?
Student: Had I trusted my instincts, I would have pursued my passion for art earlier.
Charlotte: Instincts often illuminate our true paths. What else would you have altered if given the chance?
  → marked obj(s): 1
Student: Had I been more open to failure, I would have taken more risks in my career.
Charlotte: Sure!
  → marked obj(s): 2
Student: What would you tell your younger self if you had the chance?
Charlotte: Had I read more poetry, I'd be a softer teacher today. Letters to ghosts, written out loud.
  → marked obj(s): 3
```

### ✓ A04 — Were I to, Should you — **100%** (3/3, 3 turns)

```
Charlotte: Were I to propose a meeting next week, would your team be open to it?
Student: Should the agenda allow, we'd be glad to attend.
Charlotte: What flexibility do you have on timing?
  → marked obj(s): 1
Student: Were the meeting to be scheduled in the afternoon, it would work best for us.
Charlotte: Wednesday afternoon it is, in principle. Would you prefer a specific time?
  → marked obj(s): 2
Student: Would Tuesday afternoon work for you instead?
Charlotte: Tuesday after three works for me. Correspondence drafted.
  → marked obj(s): 3
```

### ✓ A05 — Suppose, But for, Unless — **100%** (3/3, 3 turns)

```
Charlotte: Suppose money weren't an issue — what would you do for the rest of your life?
Student: Without that constraint, I'd open a small bookstore.
Charlotte: Books and quiet — a known recipe. Any condition on it?
  → marked obj(s): 1
Student: Provided that I could still travel, I'd happily live above the shop.
Charlotte: Nice.
  → marked obj(s): 2
Student: Suppose the same for you — what then?
Charlotte: But for my fear of cold, I'd write from a cabin in Norway. It's a dream, really!
  → marked obj(s): 3
```

## M02 — Inversion after negative/restrictive adverbials, time inversions, "only" inversions, emphatic inversions

### ✓ A01 — Never have I — **100%** (3/3, 3 turns)

```
Charlotte: Never have I laughed as hard as I did at that wedding last summer. Your turn — top a rare moment.
Student: Never have I felt so moved by a film as I did with that one last week.
Charlotte: Films have a way of touching our souls, don't they? Anything else rare you've experienced?
  → marked obj(s): 1
Student: Rarely do I encounter such genuine kindness from strangers.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: Seldom have I tasted something as exquisite as that dessert we shared last month.
Charlotte: Sure!
  → marked obj(s): 4
```

### ✓ A02 — Hardly had I, No sooner had I — **100%** (3/3, 3 turns)

```
Charlotte: No sooner had I sat down to write than the doorbell rang. What's your worst day-from-hell sequence?
Student: No sooner had I started my presentation than the power went out!
Charlotte: Oh no, that's a nightmare! Then what happened?
  → marked obj(s): 1
Student: Hardly had I recovered from that shock when my laptop crashed!
Charlotte: Technology really has it in for us sometimes! Did you manage to salvage the presentation?
  → marked obj(s): 2
Student: I did, but it took me hours to rewrite everything! Did you ever get back to writing?
Charlotte: Two hours and three interruptions later, I finally made some progress. Writing can be a real challenge sometimes!
  → marked obj(s): 3
```

### ✓ A03 — Not only, Not until — **100%** (3/3, 4 turns)

```
Charlotte: Not only did my grandmother raise five children alone, but she also went back to school at 50. Top that — or layer your own.
Student: Not only did my dad teach himself English, but he also learned coding at 60!
Charlotte: Generational courage. Realisation?
  → marked obj(s): 1
Student: Not until I faced my own challenges did I truly appreciate their sacrifices.
Charlotte: Parenthood is the great translator. What did your dad learn while teaching himself English?
  → marked obj(s): 2
Student: He studied grammar and vocabulary, but also embraced the culture through music and films.
Charlotte: Got it.
Student: What about your grandmother? What subjects did she focus on in school?
Charlotte: Literature — she'd been a maid in a writer's house and fell in love with books. Layered lives, properly framed.
  → marked obj(s): 3
```

### ✓ A04 — Only after, Little did I know — **100%** (3/3, 3 turns)

```
Charlotte: Only by failing my first big presentation did I learn how to prepare. What unlocked something for you?
Student: Only after losing a friend did I realize the importance of staying in touch with people.
Charlotte: Some lessons cost too much. Anything that sneaked up on you?
  → marked obj(s): 1
Student: Little did I know that a simple email would open the door to an unexpected opportunity.
Charlotte: Sure!
  → marked obj(s): 2
Student: What's your foreshadowing moment in that experience?
Charlotte: Little did I know that a borrowed book would set my whole reading life. Hindsight, well dressed.
  → marked obj(s): 3
```

### ~ A05 — Under no circumstances — **67%** (2/3, 3 turns)

```
Charlotte: At no time did our team approve this campaign. How would you defend that publicly?
Student: In no way does this campaign reflect our values, and we must clarify that to the public.
Charlotte: Clear and clean. Anything stronger?
  → marked obj(s): 1
Student: Under no circumstances will we accept responsibility for content we didn't approve.
Charlotte: That settles the legal posture too. Were you thinking about the tone of this response?
  → marked obj(s): 2
Student: I believe a firmer tone could reinforce our stance, perhaps emphasizing our commitment to integrity.
Charlotte: About right — firm without being aggressive. Defended in formal English.
```

## M03 — It-clefts, wh-clefts (pseudo-clefts), reverse pseudo-clefts, all-clefts

### ~ A01 — It was X who — **67%** (2/3, 5 turns)

```
Charlotte: Who actually built your team's first product?
Student: It was a small founding team of three who built it.
Charlotte: Great! And when did it actually ship?
  → marked obj(s): 1
Student: It was over a weekend in 2019 that we finished the first version.
Charlotte: Nice.
  → marked obj(s): 2
Student: What do you want to know next about our product or team?
Charlotte: I'm curious about the challenges you faced during development. What were some key obstacles?
Student: We encountered several challenges, including technical limitations and tight deadlines that tested our team's resilience.
Charlotte: It was the technical limitations and tight deadlines that tested your team's resilience, right? How did you overcome those challenges?
Student: We prioritized effective communication and agile methodologies, which helped us adapt quickly to the challenges we faced.
Charlotte: That sounds like a solid approach! It was your team's adaptability that made a difference. What was the most rewarding part of the project for you?
```

### ~ A02 — What I need is — **67%** (2/3, 5 turns)

```
Charlotte: What's actually missing from your week right now?
Student: What I need is two hours of uninterrupted focus to really get things done.
Charlotte: Almost everyone says this. Anything that's caught you off guard lately?
  → marked obj(s): 1
Student: What surprised me was how much I missed silence amidst all the noise.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: I guess finding that quiet time is more challenging than I expected.
Charlotte: Sounds good.
Student: You know, I never thought I'd crave silence this much in such a busy world.
Charlotte: Cool.
Student: I suppose it's funny how we often overlook the importance of stillness in our lives.
Charlotte: Sounds good.
  → stuck 3 turns, aborting
```

### ✓ A03 — All I want is — **100%** (3/3, 3 turns)

```
Charlotte: All I want from this year is fewer commitments and deeper ones. What's yours?
Student: All I want is to feel less rushed in the mornings.
Charlotte: Small thing, huge payoff. How are you doing it?
  → marked obj(s): 1
Student: All I did was start setting my alarm twenty minutes earlier.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: What did you actually change in your morning routine besides the alarm?
Charlotte: All I did was stop checking my phone before coffee. Essentials only.
  → marked obj(s): 3
```

### ✗ A04 — It wasn't until — **33%** (1/3, 4 turns)

```
Charlotte: It wasn't until my mid-thirties that I started taking sleep seriously. What came to you late?
Student: It wasn't until I lost a friend that I began replying to texts on the same day.
Charlotte: Grief teaches what nothing else will. Another?
  → marked obj(s): 1
Student: It wasn't until I faced a big challenge at work that I realized the importance of teamwork.
Charlotte: That's a powerful realization! It often takes a struggle to understand how much we need each other. Another one?
Student: It wasn't until I traveled alone that I discovered my own strength and resilience.
Charlotte: Traveling alone can be so enlightening! It wasn't until I tried therapy that I noticed how angry I was. Have you had similar experiences?
Student: It wasn't until I started journaling that I understood my emotions better.
Charlotte: Sure!
  → stuck 3 turns, aborting
```

### ✓ A05 — The reason is, The thing that — **100%** (3/3, 3 turns)

```
Charlotte: The reason I became a teacher is that I had one great one as a kid. What's a 'the reason' for you?
Student: The reason I write every morning is that I think better when nobody's watching.
Charlotte: Solitude as workshop. Defining thing?
  → marked obj(s): 1
Student: The thing that changed me most was my first proper failure; it taught me resilience and perspective.
Charlotte: Sure!
  → marked obj(s): 2
Student: Charlotte, who was your inspiring teacher?
Charlotte: Mrs. Costa, sixth grade. She read poetry aloud and waited for us to feel something. Self-portrait, in clefts.
  → marked obj(s): 3
```

## M04 — Mandative subjunctive (suggest/insist/demand that he be), past subjunctive (were across persons), "lest", fossilised subjunctive

### ~ A01 — I suggest that he be — **67%** (2/3, 3 turns)

```
Charlotte: The committee is reviewing our hiring practices. What would you recommend?
Student: I recommend that every candidate be interviewed by at least three panel members to ensure a fair assessment.
Charlotte: Strong baseline. Anything else you would suggest for our hiring practices?
  → marked obj(s): 1
Student: I also propose that the hiring criteria be made public on the company website to enhance transparency.
Charlotte: Transparency would indeed force discipline. Do you think we should bring these recommendations to a vote?
  → marked obj(s): 2
Student: Yes, I believe it would be beneficial to bring it to a vote to ensure everyone is on board.
Charlotte: Great! I will bring these recommendations to a vote at the next session. Recommendations recorded.
```

### ✓ A02 — It is essential that — **100%** (3/3, 3 turns)

```
Charlotte: We're writing the employee handbook. What's the first non-negotiable principle?
Student: I believe it is essential that every voice be heard in team decisions.
Charlotte: Voice equity — start there. What's the second principle we should include?
  → marked obj(s): 1
Student: I think it is vital that feedback be given respectfully and in private.
Charlotte: Got it.
  → marked obj(s): 2
Student: What would you add about fostering a culture of continuous learning?
Charlotte: It is crucial that opportunities for professional development be provided regularly. This encourages growth and adaptation within the team.
  → marked obj(s): 3
```

### ✓ A03 — I wish I were — **100%** (3/3, 5 turns)

```
Charlotte: I wish I were the kind of person who actually enjoys mornings. Are you a morning person?
Student: I wish I were less attached to my phone, too; it definitely makes mornings harder!
Charlotte: Different fault line, same regret. Anything you'd change?
  → marked obj(s): 2
Student: I suppose I'd love to be more spontaneous and less reliant on routines!
Charlotte: If I were braver, I'd already have deleted the apps.
Student: If I had the courage, I would probably take a break from my phone altogether!
Charlotte: Nice.
Student: Maybe we could challenge each other to spend a day without our phones!
Charlotte: Sure!
  → marked obj(s): 1
Student: Have you tried becoming a morning person instead?
Charlotte: Tried, failed, tried again. Mood across, intact.
  → marked obj(s): 3
```

### ✓ A04 — Lest, So be it — **100%** (3/3, 2 turns)

```
Charlotte: Be that as it may, learning a language in your forties is no joke. What's your take?
Student: Come what may, I'm not stopping until I can read novels in English.
Charlotte: Novels are the long game. What's the friction?
  → marked obj(s): 2, 1
Student: The friction lies in balancing my daily responsibilities with consistent practice; how do you keep yours sharp?
Charlotte: Suffice it to say, reading aloud, writing badly, and asking dumb questions help me stay sharp. Essay drafted in old idiom.
  → marked obj(s): 3
```

### ✓ A05 — Mixed subjunctive — **100%** (3/3, 3 turns)

```
Charlotte: A senior colleague keeps missing deadlines. What would you propose, and how would you handle it personally?
Student: I would suggest that we establish clearer ownership for each deliverable to ensure accountability.
Charlotte: Structural first — good. What about the conversation itself?
  → marked obj(s): 1
Student: If I were her manager, I'd ask a direct question to understand the reasons behind the missed deadlines before jumping to conclusions.
Charlotte: Got it.
  → marked obj(s): 2
Student: I might start the conversation by saying, "I've noticed some deadlines have been missed; can we discuss what's been happening?
Charlotte: I'd say: 'Help me understand what's getting in the way.' Mood matched to moment.
  → marked obj(s): 0
```

## M05 — Impersonal passive (It is said that...), double passive (He is said to be...), causative have/get, passive with reporting verbs

### ✓ A01 — It is said that — **100%** (3/3, 3 turns)

```
Charlotte: It is reported that AI will reshape half of all jobs within a decade. What's your read?
Student: I believe that while AI will indeed change many jobs, it's likely that most will evolve rather than vanish entirely.
Charlotte: It is believed that most jobs will change rather than disappear. Any other thoughts on this topic?
  → marked obj(s): 1
Student: It cannot be denied that adaptation will be uneven across industries, with some embracing AI more rapidly than others.
Charlotte: Nice.
  → marked obj(s): 2
Student: What's the outlook in teaching, then? Will AI enhance the learning experience or complicate it?
Charlotte: It is widely thought that good teaching becomes more valuable, not less, as AI tools are integrated. Hedged, honestly.
  → marked obj(s): 3
```

### ✓ A02 — He is said to be — **100%** (3/3, 2 turns)

```
Charlotte: The CEO of that startup is said to be in talks with three buyers. What else have you heard?
Student: I’ve heard that two of the cofounders are thought to be against the sale.
Charlotte: Internal friction makes deals collapse. Have there been any past actions that might signal trouble?
  → marked obj(s): 2, 1
Student: You: Any names yet?
Charlotte: An early investor is reported to have already exited his position. Smart timing or bad sign — depends who you ask.
  → marked obj(s): 3
```

### ✗ A03 — Have something done — **33%** (1/3, 4 turns)

```
Charlotte: I just had my bike serviced — saved me a hundred euros. What have you outsourced lately?
Student: I had my taxes done by an accountant this year, which really relieved me of the stress!
Charlotte: Some things are worth the fee. It must feel good to have that off your plate!
  → marked obj(s): 2
Student: Absolutely! Now I can focus on other important things without worrying about deadlines.
Charlotte: That's great to hear! I'm getting my passport renewed soon, so I understand the importance of deadlines. What else do you need to take care of?
Student: I also need to book my annual health check-up; it's something I tend to put off!
Charlotte: Health check-ups are easy to postpone. I had mine last month — always a relief to get it done! Are you planning to do it soon?
Student: Yes, I’m aiming to schedule it for next week so I can finally check it off my list!
Charlotte: That sounds like a solid plan! Was the last check-up smooth for you?
  → stuck 3 turns, aborting
```

### ✓ A04 — Get yourself done — **100%** (3/3, 3 turns)

```
Charlotte: Last month I had my passport lost by an airline. Worst part: they offered a coupon. What's your recent disaster?
Student: I had my package marked as delivered when it never arrived, and I’m still trying to track it down.
Charlotte: The phantom delivery — modern classic. Any other misfortunes on your list?
  → marked obj(s): 1
Student: I had my reservation cancelled at the last minute, which was quite frustrating.
Charlotte: And no compensation, I assume. It's always the worst!
  → marked obj(s): 2
Student: Exactly! By the way, how did you sort the passport situation?
Charlotte: Three weeks, four calls, one consulate. Minor agonies, mutual.
  → marked obj(s): 3
```

### ✓ A05 — Mixed passive register — **100%** (3/3, 2 turns)

```
Charlotte: It is widely reported that one of our competitors is about to be acquired. What's your view?
Student: I’ve heard that their CFO is said to have already met with three potential buyers.
Charlotte: If it's true, the timeline is fast. What actions are we considering in response to this news?
  → marked obj(s): 2, 1
Student: What do you think it means for us in terms of our market position?
Charlotte: Pressure on price, opportunity on talent. I'm having our own contracts reviewed in case we need to move quickly. What do you think?
  → marked obj(s): 3
```

## M06 — Participle clauses — present (-ing), past (-ed), perfect (Having + past participle), perfect passive (Having been + past participle), with-clauses

### ✗ A01 — Walking down the street — **33%** (1/3, 4 turns)

```
Charlotte: Walking past my old school last week, I felt fifteen all over again. What did your last walk make you feel?
Student: Walking through my neighbourhood, I noticed three new cafés had appeared, which made me feel excited about exploring new places.
Charlotte: Cities edit themselves while you're not looking. What else did you notice while walking?
  → marked obj(s): 2
Student: I also saw that a park had been renovated, and it looked much more inviting than before.
Charlotte: Sounds good.
Student: You know, it's amazing how little changes can make such a big difference in how we experience our surroundings.
Charlotte: Absolutely! Crossing the bridge yesterday, I realised I hadn't done that walk in years. What else do you think has changed in your area?
Student: I think the local art scene has really blossomed, with new murals and exhibitions popping up everywhere.
Charlotte: Got it.
  → stuck 3 turns, aborting
```

### ✗ A02 — Built in 1900 — **0%** (0/3, 1 turns)

```
Charlotte: Founded by a former monk, the little bookshop on my street has been there for forty years. Tell me about a place near you.
Student: Built in the 1930s, my building has the kind of doors they don't make anymore.
[API-ERR] API error 500: {"error":{"code":"500","id":"q6JK6tkseu7OBRha9VqVvUPfGSjsHdlF","message":"Internal Server Error"}}

```

### ✓ A03 — Having finished — **100%** (3/3, 3 turns)

```
Charlotte: Having taught for fifteen years, I finally feel I'm starting to understand my students. What's something experience clarified for you?
Student: Having managed people for ten years, I finally learned to stop solving problems for them.
Charlotte: Hardest leadership lesson there is. Having said that, do you find that your teams still surprise you sometimes?
  → marked obj(s): 1
Student: Absolutely! Having said that, every team still finds a way to surprise me.
Charlotte: Sure!
  → marked obj(s): 2
Student: What did your students teach you about understanding their needs?
Charlotte: That confusion is information, not failure. Experience, properly placed. What about you, SyntheticFelipe?
  → marked obj(s): 3
```

### ✗ A04 — Having been told — **33%** (1/3, 3 turns)

```
Charlotte: Having been mentored by one careful teacher in my twenties, I still hear her edits when I write. Who shaped you most?
Student: Having been taught patience by my grandfather, I find rushing through tasks quite strange.
Charlotte: Patience is the rarest inheritance. Having been pushed too hard early on, how do you approach coaching your team now?
  → marked obj(s): 1
Student: Having learned the value of support from my experiences, I now guide my team with understanding and encouragement.
Charlotte: Becoming the opposite of what hurt you — quiet rebellion. What did your mentor edit out of your work?
Student: She edited out my tendency to overcomplicate ideas, teaching me the power of clarity.
Charlotte: Adverbs and self-pity, mostly. Inheritance, in passive voice.
```

### ✗ A05 — Reduced relatives + with-clauses — **33%** (1/3, 4 turns)

```
Charlotte: The café, packed with morning regulars and warmed by the smell of fresh bread, was where I made the call. Where did you make a big call recently?
Student: The park, illuminated solely by a lone streetlight, is where I called my mother.
Charlotte: Open air and a hard conversation. What was it like for you?
  → marked obj(s): 2
Student: It was a mix of anxiety and relief, with the quiet surroundings making it feel more intimate.
Charlotte: With my heart pounding, I told her the news.
Student: You could say it was a moment of vulnerability, but also one of connection.
Charlotte: Cool.
Student: It's interesting how such moments can bring us closer, despite the tension.
Charlotte: Sounds good.
  → stuck 3 turns, aborting
```

## M07 — Advanced reporting verbs (apologise for, accuse of, suggest doing, admit + ing), reported emotions, hedged reports, "according to + X"

### ✓ A01 — Apologise for, accuse of — **100%** (3/3, 3 turns)

```
Charlotte: My colleague accused me of leaking the meeting notes. What would you have done?
Student: I would have apologised for any role in the misunderstanding, then asked for evidence.
Charlotte: Calm response under attack — that's the move. What else do you think could have contributed to this situation?
  → marked obj(s): 1
Student: I'd blame the lack of clear ownership for situations like this.
Charlotte: Sure!
  → marked obj(s): 2
Student: What did you actually do to clarify the situation with your colleague?
Charlotte: I asked who else had access, and let the question answer itself. Patterns hold the line.
  → marked obj(s): 3
```

### ✓ A02 — Admit, deny, suggest — **100%** (3/3, 3 turns)

```
Charlotte: I have to admit dreading Mondays for the first time in years. What's something you'd admit?
Student: I have to admit checking my phone first thing in the morning.
Charlotte: The modern original sin. What would you suggest to break that habit?
  → marked obj(s): 1
Student: I'd suggest leaving the phone in another room for the first hour.
Charlotte: Nice.
  → marked obj(s): 2
Student: What changed about Mondays for you, if you don’t mind me asking?
Charlotte: A meeting got rescheduled, and the whole week now starts late. Admissions, in pattern.
  → marked obj(s): 3
```

### ✓ A03 — Promise, refuse, offer — **100%** (3/3, 3 turns)

```
Charlotte: My doctor offered to refer me to a specialist, and I refused to make the appointment for two weeks. Classic me. What have you promised or refused lately?
Student: I promised to call my mother every Sunday, and so far I've kept it!
Charlotte: That’s a great promise! What about a refusal?
  → marked obj(s): 1
Student: I refused to take work calls after eight PM, and it really changed my evenings for the better.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: Charlotte, why did you delay making that appointment?
Charlotte: The diagnostic uncertainty. Avoidance, basically. Commitments, with patterns held.
  → marked obj(s): 3
```

### ~ A04 — Warn against, talk into — **67%** (2/3, 4 turns)

```
Charlotte: My grandmother talked me into studying abroad — best decision I never planned. Who shaped a big call of yours?
Student: My old boss talked me into applying for a role I thought was too senior, and it turned out to be a great opportunity!
Charlotte: Imposter syndrome's natural enemy is a good boss. Did anyone warn you about anything when you started that role?
  → marked obj(s): 1
Student: A friend warned me against committing to anything in my first month.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: Where did you go for advice when you first started?
Charlotte: Got it.
Student: I reached out to mentors and colleagues who had been in similar positions.
Charlotte: That's a solid approach! I studied abroad in Edinburgh. Cold, beautiful, life-changing. Influence reported, correctly framed.
```

### ✓ A05 — According to, allegedly — **100%** (3/3, 2 turns)

```
Charlotte: Apparently, the company is restructuring next month. Have you heard anything more?
Student: According to a colleague, three teams are being merged.
Charlotte: Mergers always look cleaner on paper. I've heard that they often come with surprises, though.
  → marked obj(s): 2, 1
Student: Where did you hear that?
Charlotte: A friend in HR. Allegedly. It’s always good to confirm before spreading news! 😊
  → marked obj(s): 3
```

## M08 — Modal hedging, softening for delicate communication, vague language, distancing devices, polite disagreement

### ✓ A01 — I was wondering if — **100%** (3/3, 2 turns)

```
Charlotte: You wanted to talk. What's on your mind?
Student: I was wondering if you could give me feedback on my proposal before Friday.
Charlotte: I have time tomorrow afternoon. What specifically would you like me to focus on?
  → marked obj(s): 2, 1
Student: Thank you for taking the time to help me with this!
Charlotte: Of course! Just let me know which sections you want me to review, and I'll be ready.
  → marked obj(s): 3
```

### ✓ A02 — It might be worth — **100%** (3/3, 3 turns)

```
Charlotte: I drafted a one-page project summary. Anything you'd tweak?
Student: It might be worth clarifying who the primary audience is.
Charlotte: Fair — I was vague there. Anything else?
  → marked obj(s): 1
Student: Have you considered adding a single metric of success to measure the project's impact?
Charlotte: Hadn't thought of it. Good catch. Anything else you think I should look at?
  → marked obj(s): 2
Student: Overall, the structure works well — these are small tweaks regarding the conclusion.
Charlotte: I'll take both. Feedback received, edges softened. What are you working on next?
  → marked obj(s): 3
```

### ✓ A03 — With respect, I'd see it differently — **100%** (3/3, 3 turns)

```
Charlotte: Remote work has run its course. People are more productive in offices. Don't you think?
Student: With respect, the productivity data hasn't really shown that remote work is less effective.
Charlotte: It depends on the study, though. Some do show that in-person collaboration can boost creativity. What do you think?
  → marked obj(s): 1
Student: I take your point about collaboration, but most of that happens through screens anyway now.
Charlotte: Fair — I'm working from instinct, not data. What evidence do you think supports your view?
  → marked obj(s): 2
Student: What's making you think that instinct is more reliable than data in this case?
Charlotte: It's more about my personal experiences during remote work. I've noticed a sense of loneliness that data might not fully capture. Argument held, civility preserved.
  → marked obj(s): 3
```

### ~ A04 — One might say, In a sense — **67%** (2/3, 3 turns)

```
Charlotte: It could be argued that working less actually makes us more productive. Your read?
Student: I would say that, in a sense, focus matters more than hours spent working.
Charlotte: That's an interesting perspective! True for knowledge work, but it may not hold in other fields. What do you think?
  → marked obj(s): 1
Student: Arguably, the four-day week works only in certain industries, where flexibility and creativity are key.
Charlotte: Absolutely! Industries like services and care work seem to resist that model. Where do you think it might work best?
  → marked obj(s): 2
Student: I believe it could be particularly effective in tech and creative sectors, where innovation thrives on flexibility.
Charlotte: That makes sense! Knowledge work, design, and writing could really benefit from that approach. Debated with distance.
```

### ✓ A05 — Sort of, more or less — **100%** (3/3, 3 turns)

```
Charlotte: How many meetings did you have this week? Roughly?
Student: I had around twelve, give or take a couple that were cancelled.
Charlotte: Cancellations are the only good meetings. How are you feeling after all those?
  → marked obj(s): 1
Student: I'm kind of exhausted, but I also feel a sense of accomplishment from everything we achieved.
Charlotte: The week-end mood par excellence. More or less, did everything go as planned for you?
  → marked obj(s): 2
Student: More or less, the week went the way I planned, with a few unexpected twists along the way.
Charlotte: That's great to hear! I had a smooth week too, give or take a small crisis on Thursday. Casual register, properly vague.
  → marked obj(s): 3
```

## M09 — High-frequency idioms, body/animal/food idioms, dead vs live metaphor, similes, idioms by register

### ✓ A01 — Hit the nail on the head — **100%** (3/3, 3 turns)

```
Charlotte: Our retention numbers slipped last quarter. The CEO thinks it's compensation, but I'm not so sure.
Student: Perhaps compensation is just the tip of the iceberg; the underlying issues might lie with management.
Charlotte: Absolutely, that's a great insight! It’s a harder pill for the CEO to swallow. What else do you think is going on?
  → marked obj(s): 1
Student: The elephant in the room is that people don't believe leadership listens.
Charlotte: Sure!
  → marked obj(s): 2
Student: What does your gut say about how we can address these concerns?
Charlotte: Same as yours, honestly. We need to start a dialogue and create a more open environment. Diagnosis, idiomatically grounded.
  → marked obj(s): 3
```

### ✓ A02 — Bite the bullet, cold feet — **100%** (3/3, 3 turns)

```
Charlotte: I bit the bullet last year and told my parents I wasn't going back into medicine. Have you ever had to deliver hard news?
Student: Yes, I once had to bite the bullet and tell my team I was leaving the project.
Charlotte: That sounds tough! Did you have any hesitation before telling them?
  → marked obj(s): 1
Student: I'd had cold feet about it for months — kept thinking I'd be giving up too much.
Charlotte: Got it.
  → marked obj(s): 2
Student: How did your parents take it when you shared your decision?
Charlotte: Quietly at first, then sadly, then fine. Hard moments, idiomatically held.
  → marked obj(s): 3
```

### ✓ A03 — Piece of cake, spill the beans — **100%** (3/3, 2 turns)

```
Charlotte: Someone leaked the salary bands to the whole company on Friday. Chaos all weekend.
Student: It seems like whoever spilled the beans must have known the timing would hit hard.
Charlotte: Friday afternoon — never an accident. It's like they wanted to stir the pot!
  → marked obj(s): 1
Student: Containing it will be no piece of cake — once the numbers are out, you can't un-leak them.
Charlotte: We're already past the 'is it true' phase. Now we just have to see how it all unfolds!
  → marked obj(s): 2, 4
```

### ✓ A04 — Two birds with one stone — **100%** (3/3, 3 turns)

```
Charlotte: I've sent over the full brief. Where do we go from here?
Student: Now the ball is in my team's court — we'll review and come back with edits by Wednesday.
Charlotte: Perfect cadence. Anything to combine?
  → marked obj(s): 1
Student: We can kill two birds with one stone by reviewing the brief during our existing standup.
Charlotte: Got it.
  → marked obj(s): 2
Student: You: Just to clarify, what's the highest priority for you in the brief?
Charlotte: The tone of the executive summary. We need to be on the same page there.
  → marked obj(s): 3
```

### ✓ A05 — Crystal clear, low-hanging fruit — **100%** (3/3, 2 turns)

```
Charlotte: Leaving the corporate job felt like the end of the world at the time. In retrospect, blessing in disguise. Have you had a moment like that?
Student: Absolutely, getting laid off in 2020 turned out to be a blessing in disguise — I finally pursued my passion for consulting.
Charlotte: Forced choices sometimes reveal the right one. How has that freedom shaped your journey so far?
  → marked obj(s): 1
Student: Independence is a double-edged sword — it gave me full agency, but also the weight of responsibility to seek out my next project.
Charlotte: Cool.
  → marked obj(s): 2, 4
```

## M10 — Advanced discourse markers — nuance (in fact, as a matter of fact), concession (that said, mind you), reformulation (in other words, put differently), topic shifts (incidentally, by the way), emphatic chains (what's more, not least, above all)

### ✓ A01 — In fact, as a matter of fact — **100%** (3/3, 3 turns)

```
Charlotte: People keep saying remote work has killed productivity. Your read?
Student: Actually, most measured studies show productivity rose or held steady, not fell.
Charlotte: And the counter-narrative?
  → marked obj(s): 1
Student: In fact, the productivity dip people remember was driven by the pandemic itself, not by where people worked.
Charlotte: Cool.
  → marked obj(s): 2
Student: Who’s saying that remote work has killed productivity, though?
Charlotte: Mostly the same CEOs who lease the empty offices. Assumption properly nuanced.
  → marked obj(s): 3
```

### ~ A02 — That said, mind you — **67%** (2/3, 4 turns)

```
Charlotte: AI is going to make most knowledge work obsolete in a decade. Hard truth.
Student: There's something to that. That said, 'most' is doing a lot of work in that sentence.
Charlotte: Fair pushback. What survives?
  → marked obj(s): 2, 1
Student: I suppose roles requiring creativity and emotional intelligence might be more resilient to AI disruption.
Charlotte: Then again, every major shift looked total in advance and partial in retrospect.
Student: That's a valid point; perhaps the strongest counter I'd make to myself is that adaptability will always be key in any evolving landscape.
Charlotte: That capability and adoption are two different timelines. Position complicated, fairly.
Student: Absolutely, it seems that while adaptability is crucial, the pace of adoption can significantly influence which roles ultimately endure.
Charlotte: Exactly! It's all about finding that balance. How do you see the future of work evolving with these dynamics?
  → stuck 3 turns, aborting
```

### ✓ A03 — In other words, put differently — **100%** (3/3, 2 turns)

```
Charlotte: We're optimising for asymmetric upside in a thin market with low capital intensity. Make sense?
Student: In other words, you're chasing big wins in a small market without spending much money to play.
Charlotte: That's it, in twelve fewer syllables. 😊 What about this: put differently, you want to find the few customers who'll pay a lot, without burning cash to find them?
  → marked obj(s): 1
Student: So, essentially, you're aiming to identify high-value customers efficiently, right?
Charlotte: Exactly! You're summarizing it well. Have I got it right?
  → marked obj(s): 2, 3
```

### ~ A04 — Above all, what's more — **67%** (2/3, 4 turns)

```
Charlotte: You chose to stay in your current job instead of taking a fancier offer. Why?
Student: I believe the work itself still excites me, and, what's more, my manager has actually been listening to my career goals.
Charlotte: Rare. What else?
  → marked obj(s): 2
Student: Additionally, the team dynamics here are fantastic, which makes a huge difference in my daily motivation.
Charlotte: And what about the team you've built?
Student: I've been fortunate to cultivate a supportive and collaborative team that inspires each other to excel.
Charlotte: Not least, the team I built took years to assemble, and I'd be starting from zero somewhere else.
Student: Absolutely, the relationships we've developed are invaluable and would be hard to replicate elsewhere.
Charlotte: And above all, the fancier offer was primarily about title — and I've learned that's not the strongest reason to move.
  → marked obj(s): 3
```

### ~ A05 — All things considered, hence — **67%** (2/3, 3 turns)

```
Charlotte: How would you sum up the year, on balance?
Student: I would say that, on balance, the year was harder than the last one but ultimately more meaningful.
Charlotte: Meaning and ease rarely arrive together. What would you say was the underlying reason for that meaning?
  → marked obj(s): 1
Student: Granted, there were challenges, but those struggles taught me valuable lessons about resilience and self-discovery.
Charlotte: That said, did you find that the lessons outweighed the difficulties? Above all, what stands out to you as the most important takeaway?
  → marked obj(s): 2
Student: I would argue that the lessons did outweigh the difficulties, with the most important takeaway being the importance of embracing vulnerability.
Charlotte: Sounds good.
```

## M11 — Word connotation (positive/negative/neutral), formal vs informal register, euphemism, loaded language, litotes and hyperbole, code-switching

### ✓ A01 — Assertive or pushy? — **100%** (3/3, 2 turns)

```
Charlotte: My new director is — I don't know — really direct? Maybe too direct. I can't decide if I admire it or it's exhausting.
Student: If you admire it, she's probably more assertive than aggressive — direct without making you feel attacked.
Charlotte: There IS room in her directness, mostly.
  → marked obj(s): 1
Student: If it's exhausting, the line you're feeling is between assertive and pushy — when directness stops leaving room for the other person.
Charlotte: Nice.
  → marked obj(s): 2, 4
```

### ~ A02 — Commence, ascertain, demonstrate — **67%** (2/3, 5 turns)

```
Charlotte: I wrote: 'We're going to kick off the new programme and look into the feedback we got.' That feels too casual for the audience. Fix?
Student: We will commence the new programme and investigate the feedback we received.
Charlotte: Better. Can it go further?
  → marked obj(s): 1
Student: We will commence the new programme and ascertain the substance of the feedback we received.
Charlotte: Sure!
  → marked obj(s): 2
Student: We shall initiate the new programme and thoroughly evaluate the feedback we have obtained.
Charlotte: Sure!
Student: We shall embark on the new programme and meticulously analyze the feedback we have gathered.
Charlotte: Cool.
Student: We shall launch the new programme and conduct a comprehensive assessment of the feedback we have collected.
Charlotte: That's quite formal! How formal does the audience need this to be?
  → stuck 3 turns, aborting
```

### ✓ A03 — Pass away, between jobs — **100%** (3/3, 3 turns)

```
Charlotte: An old friend's father passed away last week. I'm not sure what to write in the card.
Student: You could say, "I was so sorry to hear about your father's passing.
Charlotte: That's a great opener. Do you have any suggestions for what to say in the body of the card?
  → marked obj(s): 1
Student: If you want to mention specifics, you could say, "I know he meant the world to you, and you'll be in my thoughts as you navigate this.
Charlotte: Nice.
  → marked obj(s): 2
Student: How close are you to her?
Charlotte: Close enough that silence would hurt, distant enough that I shouldn't write a novel. Card drafted, weight respected.
  → marked obj(s): 3
```

### ✓ A04 — Not bad, no small feat — **100%** (3/3, 3 turns)

```
Charlotte: Saw a film last night — let's say it wasn't a complete waste of two hours. How was your week?
Student: Oh, it was a bit of a rollercoaster — not without its moments, as I got through three deadlines, and only one of them tried to kill me!
Charlotte: A respectable casualty count. What got through?
  → marked obj(s): 1
Student: I wrapped up a project redesign, and finishing it in a week was no small feat — I could definitely use a quiet weekend now!
Charlotte: Quiet weekends are not exactly easy to come by. Were you busy?
  → marked obj(s): 2
Student: You could say that! I had a couple of meetings and a few urgent tasks, but what about that film you saw? What was it?
Charlotte: Three hours, two narrators, one ending I'm not entirely sure I understood. Deadpan, sustained.
  → marked obj(s): 3
```

### ✓ A05 — Code-switching — **100%** (3/3, 3 turns)

```
Charlotte: (As your manager) I understand you have concerns about the timeline. Walk me through them.
Student: I appreciate the opportunity to share my view; my primary concern is that the current build hasn't completed a full regression cycle, which puts the launch quality at risk.
Charlotte: (Now your peer) Off the record — same question, plain English.
  → marked obj(s): 1
Student: Honestly? We're nowhere near ready; the tests are still failing, and we're just pretending they're flaky.
Charlotte: (Now your closest friend) And what's underneath all that?
  → marked obj(s): 2
Student: I'm not sleeping; every time I close my eyes, I see the bug list, and I can't shake the fear that if it fails publicly, it'll all fall on me.
Charlotte: Three audiences, three Englishes, one truth underneath. Register, fully fluent. C1 block closed.
  → marked obj(s): 3
```

### ✓ A06 — UK vs US + Falsos cognatos cross-link — **100%** (3/3, 2 turns)

```
Charlotte: If you're writing to an American client, you should use 'elevator', 'apartment', 'vacation'. But for British clients, switch to 'lift', 'flat', 'holiday'. Which version do you default to?
Student: I usually default to American English since that’s what my schoolbooks used, but I’ve become more flexible after working with British colleagues.
Charlotte: Sensible. And false cognates from Portuguese — which ones still trip you?
  → marked obj(s): 1
Student: Honestly, 'realise' still catches me — in Portuguese 'realizar' means 'to carry out', but in English it usually means 'to understand'. I've to consciously pause.
Charlotte: Nice.
  → marked obj(s): 2, 4
```

## M12 — Academic register — nominalisation, impersonal voice, hedged claims, citation patterns, paragraph cohesion

### ✓ A01 — Nominalisation — **100%** (3/3, 3 turns)

```
Charlotte: I've drafted: 'Companies are spending more on cybersecurity every year.' For a research paper — too plain. Help me lift it?
Student: How about: 'The increase in corporate cybersecurity spending has accelerated in each of the past five years.'?
Charlotte: Much better! Anything else we can compress or enhance in that sentence?
  → marked obj(s): 1
Student: You could also mention the cause: 'driven in part by the emergence of new threat vectors and a shift towards remote work.
Charlotte: Nice.
  → marked obj(s): 2
Student: What does the paper actually claim about the implications of this increased spending?
Charlotte: That spending grows faster than effectiveness — efficiency, not budget, is the bottleneck. Opener academically pitched.
  → marked obj(s): 3
```

### ✓ A02 — Impersonal voice — **100%** (3/3, 3 turns)

```
Charlotte: Here's my draft: 'I've noticed that students seem to do better when they get feedback within 24 hours. I think this is because the connection between work and response is fresh.' For a paper — too subjective. Fix?
Student: Try: "The data suggest that students perform measurably better when feedback is delivered within 24 hours.
Charlotte: Great start! Now, how can you explain why this happens?
  → marked obj(s): 1
Student: A plausible explanation is that the temporal proximity between task and response strengthens the cognitive link between effort and outcome.
Charlotte: Got it.
  → marked obj(s): 2
Student: How strong is the evidence for this claim — is it based on a specific study or your classroom observations?
Charlotte: Two small studies support this observation, along with a decade of teaching experience. This makes the paragraph academically dressed! 🎓
  → marked obj(s): 3
```

### ✓ A03 — Hedged claims — **100%** (3/3, 3 turns)

```
Charlotte: I wrote: 'Our findings prove that remote workers are more productive than office workers.' For a journal — too strong. Help me dial it back?
Student: Try: "Our findings suggest that, within the sample studied, remote workers demonstrated higher productivity on the measures examined.
Charlotte: Much safer! Now, can you add a limitation to that statement?
  → marked obj(s): 1
Student: And: "It should be noted that the effect was modest and may not generalise to roles requiring extensive in-person collaboration.
Charlotte: Nice.
  → marked obj(s): 2
Student: How big was the effect, actually, in terms of productivity metrics?
Charlotte: About 4% on objective measures, more on self-report. Claim accurate, hedge fitting.
  → marked obj(s): 3
```

### ✓ A04 — Citation patterns — **100%** (3/3, 3 turns)

```
Charlotte: Smith said in 2020 that early feedback matters. I'm writing about it for my paper. How do I phrase that?
Student: Try: "Smith (2020) argues that early feedback has a measurable effect on subsequent performance.
Charlotte: That's perfect! And how do I link it to my own work?
  → marked obj(s): 1
Student: Then, you could say: "Building on Smith's (2020) framework, the present study examines whether the effect persists in longer-cycle creative tasks.
Charlotte: Sure!
  → marked obj(s): 2
Student: What other sources are you weaving in to support your argument?
Charlotte: I'm referencing three more papers, each focusing on narrower aspects than Smith's study. They help frame my literature review effectively.
  → marked obj(s): 3
```

### ✓ A05 — Paragraph cohesion — **100%** (3/3, 3 turns)

```
Charlotte: My first paragraph ends: 'The intervention reduced anxiety by 23%.' How do I open the next paragraph to keep flow?
Student: You might say: "This reduction in anxiety, while substantial, was not uniform across subgroups.
Charlotte: Perfect bridge to the subgroup analysis! What if I want to contrast findings in this section?
  → marked obj(s): 1
Student: By contrast, depressive symptoms showed only a marginal change over the same period.
Charlotte: Cool.
  → marked obj(s): 2
Student: How are you planning to land the conclusion?
Charlotte: I plan to wrap it up with a 'Taken together' synthesis and a limitations paragraph. Discussion threaded, C2 opener landed.
  → marked obj(s): 3
```

## M13 — Building argument (claim/warrant/evidence), anticipating counterargument, rhetorical devices (anaphora, antithesis, tricolon), persuasive structure, strong conclusions

### ✓ A01 — Building the case — **100%** (3/3, 5 turns)

```
Charlotte: We're considering a four-day workweek. Build the case for trying it.
Student: The case for piloting a four-day workweek rests on what we already know about attention and output, as studies suggest that shorter weeks can boost productivity and employee satisfaction.
Charlotte: Great start! Can you give me three specific reasons to support that case?
Student: Firstly, research indicates that a condensed workweek can reduce burnout, leading to more focused and engaged employees.
Charlotte: That's a solid first reason! What’s your second reason?
Student: Secondly, a four-day workweek can enhance work-life balance, allowing employees more time for personal activities, which can ultimately improve their overall well-being.
Charlotte: Excellent! Now, what's the most important reason to support this case?
  → marked obj(s): 1
Student: Most importantly, studies show that well-rested employees make better decisions, which is crucial for overall company success.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: What's the loudest objection in your team regarding the four-day workweek?
Charlotte: The main concern is client coverage on Fridays. Many worry about maintaining service levels. Argument constructed, climax delivered.
  → marked obj(s): 3
```

### ~ A02 — Anticipating counterargument — **67%** (2/3, 5 turns)

```
Charlotte: You're proposing remote-first hiring. But isn't that just outsourcing in disguise?
Student: While some critics might frame it that way, it's important to recognize that outsourcing focuses on cost savings, whereas remote-first hiring prioritizes access to a diverse talent pool.
Charlotte: Talent access is doing a lot of work in that sentence. How do you define that access?
  → marked obj(s): 1
Student: The deeper question is whether we are willing to define talent narrowly enough to fit inside one city — and whether that narrow definition has served us.
Charlotte: Nice.
  → marked obj(s): 2
Student: You might say that redefining our talent criteria could open doors to innovation we never imagined.
Charlotte: Absolutely! Innovation thrives on diverse perspectives. But what about the potential challenges of remote collaboration?
Student: While remote collaboration can pose challenges, such as communication barriers, I believe that establishing clear protocols and leveraging technology can effectively bridge those gaps.
Charlotte: That's a great point! However, it would be a mistake to assume that technology alone can solve all collaboration issues. What do you think?
Student: You're right; a human touch is essential, as fostering relationships and trust often requires more than just technological tools.
Charlotte: Exactly! So, what strategies do you think can help build that human connection in a remote-first environment?
  → stuck 3 turns, aborting
```

### ✓ A03 — Anaphora, antithesis, tricolon — **100%** (3/3, 3 turns)

```
Charlotte: I'm opening a conference on disability rights tomorrow. Help me draft an opener that lands.
Student: We are here because rights are not granted, they are demanded; because patience has limits; and because no one is coming to do this for us.
Charlotte: Strong anaphora! What goes in the middle?
  → marked obj(s): 1
Student: Then drop in: "Accessibility is not charity — it is justice taking the form of a ramp, a captioned line, an opened door.
Charlotte: That sentence is the keeper. Now, how should we close this?
  → marked obj(s): 2
Student: Today we listen, tomorrow we organise, every day after that we demand.
Charlotte: Opener drafted, rhetorically structured. I'm excited for the impact it will have! What do you think about including a personal story in the speech?
  → marked obj(s): 3
```

### ✓ A04 — Cause-and-effect chains — **100%** (3/3, 3 turns)

```
Charlotte: Why has consumer trust in news dropped so sharply?
Student: It's likely that the shift to ad-driven revenue forced outlets to chase clicks, rewarding sensationalism over substance.
Charlotte: And from there? What happened next in this chain of events?
  → marked obj(s): 1
Student: Sensationalism eroded credibility, which in turn fed the narrative that "the media is biased," justifying consumers' turn to less-edited sources.
Charlotte: That's a self-reinforcing collapse. It creates a cycle that's tough to break. How do you think we can shift this dynamic?
  → marked obj(s): 2
Student: From this it follows that rebuilding trust requires not better content, but a different business model — one not financed by attention.
Charlotte: That's the hard part — and the right one. Causal chain, fully landed.
  → marked obj(s): 3
```

### ✓ A05 — Strong conclusions — **100%** (3/3, 3 turns)

```
Charlotte: The speech is on civic participation. How would you close it?
Student: I would emphasize that what is at stake is not just turnout, but our belief in the power of collective decisions to create real change.
Charlotte: That reframes the whole talk! Now, what choice do we face in this situation?
  → marked obj(s): 1
Student: The choice before us is clear: we can choose to actively engage in shaping our society, or we can passively accept a role that diminishes our influence.
Charlotte: That's powerful! Now, what's the final call to action you want to leave them with?
  → marked obj(s): 2
Student: If we fail to show up, we risk letting others decide our future, so let's fill those empty spaces with our voices and choices.
Charlotte: The room you leave empty will be filled. That's the line they'll quote. Speech closed, persuasion complete! 🎉 What do you think about the overall message?
  → marked obj(s): 3
```

## M14 — Metaphor and extended metaphor, simile patterns, personification, imagery, sentence rhythm and fragments, showing over telling

### ✓ A01 — Metaphor and simile — **100%** (3/3, 3 turns)

```
Charlotte: Take 'attention is the new oil'. Run it for three sentences — extend it without restating.
Student: In today's digital landscape, capturing attention has become as valuable as oil was in the past, as it fuels engagement and drives success; therefore, businesses are strategically crafting their narratives to ensure they remain in the spotlight.
Charlotte: Now extend.
Student: This shift has led to a fierce competition for consumer focus, prompting companies to innovate constantly in their marketing strategies to stand out amidst the noise.
Charlotte: Close it.
Student: Ultimately, in this attention-driven economy, those who master the art of engagement will thrive while others fade into obscurity.
Charlotte: That last clause earns the metaphor. Sustained, not stated. Well done, SyntheticFelipe! How do you feel about the impact of attention on modern society?
  → marked obj(s): 1, 2, 3
```

### ✓ A02 — Personification — **100%** (3/3, 4 turns)

```
Charlotte: I wrote: 'The office was empty. The lights were on. The clock said 8 p.m.' Too flat. Animate it.
Student: The office held its breath in the absence of anyone to hold it for.
Charlotte: That's the opener! How about the lights and the clock?
  → marked obj(s): 1
Student: The overhead lights kept their nightly vigil over no one in particular, while the clock, indifferent as always, announced eight in red.
Charlotte: Got it.
  → marked obj(s): 2
Student: The silence wrapped around the room like a thick fog, amplifying the ticking of the clock.
Charlotte: Got it.
Student: What mood are you going for—mysterious, eerie, or perhaps something more suspenseful?
Charlotte: Lonely without melodrama. Description, finally animate.
  → marked obj(s): 3
```

### ~ A03 — Vivid verbs, specific nouns — **67%** (2/3, 5 turns)

```
Charlotte: I wrote: 'She went into the café and sat down. A man was there. He was looking at his phone.' Bring it to life.
Student: She pushed through the door of the café and slid into the booth by the window.
Charlotte: Now the man.
  → marked obj(s): 1
Student: In the corner, a man in a grey overcoat was hunched over his phone, thumb scrolling slowly enough to suggest he wasn't reading anything.
Charlotte: Nice.
  → marked obj(s): 2
Student: He glanced up occasionally, his eyes darting around the room as if searching for something—or someone.
Charlotte: Sounds good.
Student: The air was thick with the aroma of fresh coffee, and the soft murmur of conversations created a cozy yet tense atmosphere.
Charlotte: Got it.
Student: Outside, raindrops tapped against the window, adding a rhythmic backdrop to the unfolding scene inside.
Charlotte: What mood are you aiming for in this scene?
  → stuck 3 turns, aborting
```

### ~ A04 — Sentence rhythm and fragments — **67%** (2/3, 5 turns)

```
Charlotte: I wrote: 'When my father died I was thirty-two and I didn't know what to do and the house felt strange and nothing made sense for a long time.' All one breath. Help me break it.
Student: Try: "When my father died, I was thirty-two; the house felt strange—not different, exactly, but watchful, as if waiting for someone who wouldn't return.
Charlotte: That image is powerful. Keep going; let’s add more layers to it.
  → marked obj(s): 1
Student: Then add: "I did not know what to do. Nothing made sense for a long time. That was the year I learned to live with not-knowing.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: Perhaps we could explore how that feeling of not-knowing shaped your daily life and relationships during that time.
Charlotte: Absolutely, it affected everything. I felt disconnected from friends, lost in my routines. I was searching for meaning in the mundane, struggling to find my footing. What do you think?
Student: It might be compelling to illustrate specific moments or interactions that highlight that disconnection and search for meaning.
Charlotte: Great idea! I remember a coffee date with a friend. I smiled, but inside, I was miles away, lost in thoughts of my father. It felt like acting, not living. What do you think about that scene?
Student: That scene vividly captures the contrast between your outward appearance and inner turmoil; perhaps you could emphasize the dialogue or silence that underscored that disconnect.
Charlotte: I could write about how my friend asked if I was okay, and I just nodded. The silence felt heavy, like an unspoken truth between us. It was disheartening. What do you think?
  → stuck 3 turns, aborting
```

### ✓ A05 — Show, don't tell — **100%** (3/3, 3 turns)

```
Charlotte: I wrote: 'She felt lonely in the new city. The apartment was empty. She missed her friends.' Three flat tells. Show them.
Student: Try: "She kept the radio on while she cooked, then while she ate, then while she fell asleep. The voices of strangers, at least, didn't change.
Charlotte: That last clause is the line! How about the empty apartment?
  → marked obj(s): 1
Student: Then: "The chair she bought for two had been pulled to face the window. Nobody ever needed to sit across from her.
Charlotte: Perfect! Now, how about showing her missing friends?
  → marked obj(s): 2
Student: She kept opening the group chat without typing. Sometimes she read old messages instead of writing new ones.
Charlotte: Scene shown, not told. C2 literary craft set.
  → marked obj(s): 3
```

## M15 — High-C2 phrasal verbs — separable/inseparable distinctions, multiple meanings, low-frequency but native-natural verbs

### ✓ A01 — Bring about, bring round, come round — **100%** (3/3, 3 turns)

```
Charlotte: It took my company three years to accept remote work. How would you describe that process?
Student: I would say that what brought about the shift was probably the talent leaving — once people quit, the policy followed.
Charlotte: Departures usually do more than memos. It’s interesting to see how that impacts change, right?
  → marked obj(s): 1
Student: Absolutely, sometimes it takes significant losses for leadership to really take action.
Charlotte: Senior leadership came round slowly — they had to lose two key hires before the policy really moved.
  → marked obj(s): 2
Student: Who was the last to come round, then?
Charlotte: The CFO. He brought about a 'compromise' that was just remote work in different language. It's funny how those titles can change the conversation!
  → marked obj(s): 3
```

### ✗ A02 — Gloss over, crop up, single out — **33%** (1/3, 2 turns)

```
Charlotte: I read three different write-ups of the same story and got three different impressions. What does that tell you?
Student: It suggests that each version probably glossed over the angles inconvenient to its own audience.
Charlotte: That's the modern condition! Did you notice any patterns in the facts presented?
  → marked obj(s): 1
Student: The same two facts probably crop up in all three, but framed in completely different ways.
[API-ERR] API error 500: {"error":{"code":"500","id":"pgHYvYcxI6APIlMVFt4sW3BOaMDoasdo","message":"Internal Server Error"}}

```

### ✓ A03 — Live up to, fall through, iron out — **100%** (3/3, 3 turns)

```
Charlotte: Q2 was rough — two contracts collapsed and our product didn't perform like we promised. What would you have done?
Student: I would have communicated openly about the challenges; after all, not living up to a public promise is the hardest thing to recover from.
Charlotte: It's slower than the financial recovery, that's for sure. Trust takes time to rebuild, doesn't it?
  → marked obj(s): 1
Student: Absolutely, the path back is usually quiet — we need to iron out the technical issues, deliver a single boring quarter, and let the noise die down.
Charlotte: Got it.
  → marked obj(s): 2
Student: How did you tide the team over financially during that period?
Charlotte: A short bridge from existing investors. Nothing dramatic — just enough to give us six months of quiet. Quarter survived, phrasally.
  → marked obj(s): 3
```

### ✓ A04 — Talk down to, wear down, shake off — **100%** (3/3, 3 turns)

```
Charlotte: I worked with someone for five years who talked down to everyone but never noticed. I tried to address it — and got nowhere.
Student: It's interesting how silence can be misinterpreted as acceptance; perhaps they just never realized the impact of their words.
Charlotte: Yes, exactly! People who talk down to others rarely see it because the people they patronize don't push back. It's a damaging dynamic.
  → marked obj(s): 1
Student: Absolutely, five years of that kind of behaviour wears you down without you realising it — the small daily costs add up.
Charlotte: It took me six months to notice how much lighter I felt after leaving. It’s surprising what we can endure until we step away from it all.
  → marked obj(s): 2
Student: Have you shaken it off, now that you're out?
Charlotte: Mostly. The instinct to brace for the next correction took the longest to lose. Hard relationships, phrasally named.
  → marked obj(s): 3
```

### ✓ A05 — Stem from, amount to, water down — **100%** (3/3, 3 turns)

```
Charlotte: The product team keeps missing its targets. The pattern is too consistent to be bad luck. What's your hypothesis?
Student: I would suggest that my hypothesis is that it stems from how the targets get set — perhaps there's too much top-down influence and not enough input from the team.
Charlotte: Process, not people. Let's dig deeper into that. What do you think the current process amounts to in terms of outcomes?
  → marked obj(s): 1
Student: I believe the current process amounts to manufacturing failure: targets are set that nobody believes in, leading to surprise when they aren't achieved.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: If that's the case, where would you intervene first to improve the target-setting process?
Charlotte: The forecasting meeting. The whole pattern stems from what happens — or doesn't — in that one hour. Diagnosis, phrasally precise.
  → marked obj(s): 3
```

## M16 — Prefixes (un-, dis-, mis-, pre-, over-, under-, re-), suffixes (-tion, -ment, -ness, -ity, -able, -ise), compounds (closed/hyphenated/open), conversion (noun ↔ verb), nuanced word families

### ✓ A01 — Negation prefixes — **100%** (3/3, 3 turns)

```
Charlotte: My old colleague is really unresponsible with deadlines. Drove me mad.
Student: Actually, it's "irresponsible" with "ir-" before "responsible.
Charlotte: Right. I always second-guess that one. Have you ever encountered someone who was unprofessional in their work?
  → marked obj(s): 1
Student: Yes, I once worked with someone whose approach to clients was unprofessional — late replies and missed details were hard to ignore.
Charlotte: Cool.
  → marked obj(s): 2
Student: Did he ever change his ways after feedback, or was it always the same?
Charlotte: Only after losing a major account. By then it was too late. Vocabulary calibrated.
  → marked obj(s): 3
```

### ~ A02 — Suffixes for nouns — **67%** (2/3, 2 turns)

```
Charlotte: I wrote: 'The team decided to expand, and they performed better. We grew faster than competitors.' For a board report — too active. Help me nominalise?
Student: The decision to expand resulted in enhanced team performance and accelerated growth compared to competitors.
Charlotte: Stronger! Now it reads more like a report. Do you think we captured the audience's needs?
  → marked obj(s): 1, 2
Student: It might be helpful to consider whether the audience is the internal board or the shareholders, as that could influence the tone and detail.
Charlotte: Exactly! The audience is shareholders for a quarterly letter. Verbs to nouns, register lifted. How do you feel about the revisions?
```

### ✓ A03 — Suffixes for adjectives and verbs — **100%** (3/3, 3 turns)

```
Charlotte: I want to say someone 'can be relied on' — is the word 'relyable'?
Student: Close — it's 'reliable'. The 'y' in 'rely' changes to 'i' before '-able'.
Charlotte: I always second-guess that. It's tricky!
  → marked obj(s): 1
Student: I understand; it’s a common pattern—like 'predict' to 'predictable' and 'apply' to 'applicable'.
Charlotte: The rule is consistent, then. It's helpful to remember those examples!
  → marked obj(s): 2
Student: Who are you describing as reliable in your life?
Charlotte: An old project manager. Quietly heroic. Spellings, finally trusted.
  → marked obj(s): 3
```

### ✓ A04 — Compounds — **100%** (3/3, 3 turns)

```
Charlotte: I wrote: 'My state of the art smartphone helps me check work mail in the post office.' Anything to fix?
Student: You should hyphenate it as 'state-of-the-art' when it modifies a noun, so it should be 'My state-of-the-art smartphone...
Charlotte: Ah — position-dependent! What about the other compounds?
  → marked obj(s): 1
Student: Smartphone' is correctly closed, and 'post office' is correctly open — those two were already right.
Charlotte: Got it.
  → marked obj(s): 2
Student: Anything else you're unsure about?
Charlotte: 'Half-hour' vs 'half hour' — I never know which. (It's 'half-hour' when before a noun, 'half an hour' as a standalone.) Spacing audit, complete.
  → marked obj(s): 3
```

### ✗ A05 — Conversion — **33%** (1/3, 4 turns)

```
Charlotte: I told my daughter I would send her a text message later. She laughed at me.
Student: Maybe she found it funny because natives usually just say, "I'll text you.
Charlotte: Exactly! I do that with email too, then? 'I'll email you'?
  → marked obj(s): 1
Student: Yes, that's right! Just say, "I'll email you," to keep it simple.
Charlotte: Same goes for 'do a Google search' → 'google it'. Conversion makes English faster!
Student: Absolutely! Using verbs this way really speeds up communication.
Charlotte: I'm starting to understand why my old textbooks sound stiff. It's fascinating how language evolves!
Student: Definitely! Embracing these changes makes your English sound more natural and fluent.
Charlotte: Cool.
  → stuck 3 turns, aborting
```

## M17 — Ellipsis (leaving things out), substitution with "do/so/one", "so do I" / "neither do I" patterns, "do so" vs "do it", verb-phrase ellipsis with auxiliaries

### ✓ A01 — Ellipsis after "to" — **100%** (3/3, 3 turns)

```
Charlotte: Did you ever finish that book you were reading?
Student: I meant to finish it, but I got distracted by another one halfway through.
Charlotte: Same. Books are like Netflix series — three at once, none finished. 😅
  → marked obj(s): 1
Student: I should, really — it was on my reading list for a reason.
Charlotte: We say that every January. 📚
  → marked obj(s): 2
Student: Did you finish yours, or are you still juggling a few?
Charlotte: I'd like to say yes. I can't. Casual ellipsis, native rhythm.
  → marked obj(s): 3
```

### ✓ A02 — So and not as substitutes — **100%** (3/3, 4 turns)

```
Charlotte: Is the new policy going through this week?
Student: I believe so — the legal review wrapped up yesterday.
Charlotte: Any blockers left?
  → marked obj(s): 1
Student: Though I'm afraid there's still one signature missing from the executive sponsor — we may slip by a day.
Charlotte: One signature shouldn't be a project, right?
  → marked obj(s): 2
Student: True, but it could delay the kickoff if we don't get it soon.
Charlotte: Cool.
Student: Will you be at the kickoff?
Charlotte: I hope so — depends on whether the sponsor finally signs. It's a busy time!
  → marked obj(s): 3
```

### ✓ A03 — One, ones, that of — **100%** (3/3, 3 turns)

```
Charlotte: These two jackets are basically identical. Which one would you go for?
Student: Honestly, I’d take the navy one — the cut sits better at the shoulders.
Charlotte: I keep looking at the navy too. It's just so classic! What do you think about the other one?
  → marked obj(s): 1
Student: The other one looks like it was made for someone slightly taller — the proportions seem off.
Charlotte: Cool.
  → marked obj(s): 2
Student: Which one do you keep coming back to?
Charlotte: The navy. The decision was made before I walked in. Substitution flows like English flows.
  → marked obj(s): 3
```

### ✗ A04 — Do so / do it / do that — **33%** (1/3, 4 turns)

```
Charlotte: I made the switch to a four-day workweek last year. Several colleagues followed. Tell me about a change you made.
Student: I cut my caffeine in half last spring, and my partner did the same a few weeks later—sympathy headaches, mostly.
Charlotte: I love when household changes ripple. It's amazing how one decision can inspire others. What about your friends? Did they notice your change?
  → marked obj(s): 2
Student: Yes, they did; some even asked for tips on reducing caffeine, which was surprising!
Charlotte: That's great to hear! It shows how influential your change was. Two of my friends had been thinking of doing so for months — my switch seemed to give them permission.
Student: It’s interesting how our choices can create a sort of domino effect among friends, isn’t it?
Charlotte: Got it.
Student: Absolutely! It’s like we’re all interconnected, and one small change can lead to bigger transformations.
Charlotte: I completely agree! We underestimate how much permission others need before they move. Have any of your friends made significant changes since then?
  → stuck 3 turns, aborting
```

### ✓ A05 — So do I, neither do I — **100%** (3/3, 3 turns)

```
Charlotte: I never check email before coffee.
Student: Neither do I — the first hour belongs to me, not to whoever wrote at 6 a.m.
Charlotte: Coffee plus newspaper. Sacred.
  → marked obj(s): 1
Student: I always read for twenty minutes before bed — and so do I, even when the day was a wreck.
Charlotte: Twenty minutes of someone else's prose is the best sleep aid I know.
  → marked obj(s): 2
Student: What else do you protect in your morning routine?
Charlotte: Saturday mornings — no calls, no errands, just slow. So do you, I bet. Habits matched, echoes tuned.
  → marked obj(s): 3
```

## M18 — Reference chains, lexical cohesion (synonyms, hyponyms, repetition), old-information-first principle, bridging implicit links, avoiding ambiguous referents

### ✓ A01 — This, that as reference — **100%** (3/3, 3 turns)

```
Charlotte: I wrote: 'We had three problems last quarter. Costs were up. Revenue was flat. Morale dipped. We need to address them.' Feels jumpy. Help?
Student: Try: "These three pressures reinforce one another in ways the leadership team hasn't yet acknowledged.
Charlotte: That single sentence does a lot. It ties everything together nicely! What do you think we should add next for clarity?
  → marked obj(s): 1
Student: And close with: "This combination of pressures rarely resolves itself — addressing one in isolation tends to make the others worse.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: Where does the paragraph land in terms of urgency and proposed action?
Charlotte: It lands on a strong recommendation to address all three issues in one meeting. This way, the leadership team can tackle the problem comprehensively. Paragraph stitched, demonstratively.
  → marked obj(s): 3
```

### ✓ A02 — Lexical chains — **100%** (3/3, 4 turns)

```
Charlotte: I wrote: 'The CEO announced the merger. The CEO said it would close in March. The CEO refused questions. The CEO walked out.' Help me vary it.
Student: You could say: "The CEO announced the merger and stated it would close in March, but then refused to answer questions before walking out.
Charlotte: Great start! Can you help me add two more sentences to that?
  → marked obj(s): 1
Student: Certainly! You might add: "The atmosphere in the room grew tense as reporters exchanged glances, hoping for more clarity. Ultimately, their frustration was palpable when the CEO left without further comment.
Charlotte: I forget how much pronouns help. Using 'he' or 'the executive' makes the flow better.
  → marked obj(s): 2
Student: Absolutely! Incorporating pronouns can definitely enhance the coherence of your writing.
Charlotte: Nice.
Student: Why does this trip you up?
Charlotte: I draft fast and worry the reader will lose track. Repetition replaced, prose breathes.
  → marked obj(s): 3
```

### ~ A03 — The former, the latter, such — **67%** (2/3, 5 turns)

```
Charlotte: We're choosing between two strategies: aggressive expansion or careful consolidation. Which favours which moment?
Student: I think the former tends to favour markets where competitive position is still up for grabs and capital is patient.
Charlotte: Patient capital is the rarest condition. What about the latter? How does it fit into our current situation?
  → marked obj(s): 1
Student: The latter tends to suit moments when the underlying assets are strong but the operating model is straining under its own complexity.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: In our current situation, careful consolidation might be the safer bet to stabilize and streamline operations.
Charlotte: Sounds good.
Student: You might also consider how external market conditions could influence our decision.
Charlotte: Cool.
Student: Have we assessed the potential risks and rewards of each strategy in our specific context?
Charlotte: That's a great question! I believe the second option is more relevant for us right now. Which moment do you think we are in?
  → stuck 3 turns, aborting
```

### ✗ A04 — Old information first — **33%** (1/3, 4 turns)

```
Charlotte: I wrote: 'Significant gains were produced by the new strategy. A complete restructuring of the sales team was required by these gains.' Awkward — help?
Student: Try: "The new strategy produced significant gains, necessitating a complete restructuring of the sales team.
Charlotte: Lighter already! Now, can you reorder the second part?
  → marked obj(s): 2
Student: Try: "The new strategy produced significant gains, prompting a complete restructuring of the sales team.
Charlotte: Sure!
Student: Great! That sounds much smoother now.
Charlotte: I'm glad you think so! It really does help the information flow better. 😊 Were you busy with this writing?
Student: Not too busy, just happy to help with your writing!
Charlotte: Thank you, SyntheticFelipe! Your input is always valuable. Flow reordered.
```

### ✓ A05 — Bridging and avoiding ambiguous referents — **100%** (3/3, 3 turns)

```
Charlotte: I wrote: 'The CEO met with the head of legal yesterday. She said the deal would close. They disagreed about the timeline. Now it's all in their hands.' Confusing — fix?
Student: Try: "The CEO told the head of legal yesterday that the deal would close, but they disagreed about the timeline, so it's now in their hands.
Charlotte: Already clearer! Keep going with the next part.
  → marked obj(s): 1
Student: The executive team will ultimately decide how to proceed based on their discussions.
Charlotte: Cool.
Student: The team is expected to reach a conclusion by the end of the week.
Charlotte: Sure!
  → marked obj(s): 2, 4
```

## M19 — Fine shades of modal meaning — certainty (must/will/should/might/may), obligation vs inference, layered modals (might have to), quasi-modals (be supposed to / be bound to / be likely to), formal modals (ought to / shall / would)

### ✓ A01 — Must, will, should — three shades of certainty — **100%** (3/3, 3 turns)

```
Charlotte: My neighbour's lights have been on all night for three nights running. Strange — she's usually asleep by ten. Theories?
Student: She might have a deadline, or perhaps she’s looking after someone who needs the light on.
Charlotte: Both plausible. Anything stronger?
  → marked obj(s): 1
Student: If it's been three nights running, something must have changed in her routine — and whatever it is, she should be exhausted by now.
Charlotte: I keep thinking of knocking but not sure I should.
  → marked obj(s): 2
Student: Do you know her well enough to knock?
Charlotte: Just enough that not knocking feels worse than knocking. Inferences, properly weighted.
  → marked obj(s): 3
```

### ✓ A02 — Might well, could well, may well — **100%** (3/3, 3 turns)

```
Charlotte: Three of our biggest competitors are quietly raising prices this month. What do you make of it?
Student: It could well be a coordinated signal that input costs have finally moved beyond what any of them can absorb.
Charlotte: What does that mean for us?
  → marked obj(s): 1
Student: And if that's the case, we may well find ourselves under pressure to follow within six weeks — or risk looking like we don't share their pricing power.
Charlotte: That's the corner I'm trying not to be cornered into.
  → marked obj(s): 2
Student: Has your team modelled the move yet?
Charlotte: Two scenarios on the table — both with prices up by year-end. Probabilities, evenly hedged.
  → marked obj(s): 3
```

### ✓ A03 — Ought to, shall, would — **100%** (3/3, 4 turns)

```
Charlotte: Draft a clause for a service contract — what should the contractor be obliged to do?
Student: The contractor should ensure they maintain professional liability insurance with coverage of at least five hundred thousand euros during the contract period.
Charlotte: Standard but well-worded! And what about the implicit obligations?
Student: The contractor should also adhere to industry standards and deliver services in a timely manner, ensuring quality and compliance with all regulations.
Charlotte: That's a solid addition! Beyond the contract, both parties ought to communicate openly about delays — even when no specific clause requires it.
  → marked obj(s): 1
Student: Absolutely, clear communication can prevent misunderstandings and foster a better working relationship.
Charlotte: That's the kind of clause I never see in print but always wish for. What about your past experiences? How did you approach contract discussions?
  → marked obj(s): 2
Student: My old mentor would always start contracts by asking what the other party most feared — that question shaped every clause after.
Charlotte: I'm going to steal that! Shall, ought, would — three eras. What a journey we've had together in mastering these nuances!
  → marked obj(s): 3
```

### ✓ A04 — Be bound to, be likely to, be supposed to — **100%** (3/3, 3 turns)

```
Charlotte: The pilot launch was meant to start in March. Now I'm not sure it'll happen before June. Your read?
Student: If three weeks have already slipped, March is unlikely to hold — June is starting to look like the realistic baseline.
Charlotte: I keep telling stakeholders March is still possible. Maybe I shouldn't.
  → marked obj(s): 1
Student: And once a date slips publicly, the next one is bound to be questioned — credibility is the hidden cost of these delays.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: What specifically was supposed to be ready by March?
Charlotte: Two integrations and a single onboarding flow. None of which are even close. Timing, modally weighed.
  → marked obj(s): 3
```

### ~ A05 — Modal layering — **67%** (2/3, 3 turns)

```
Charlotte: If the funding round closes below target, what changes?
Student: If we close ten to twenty percent below target, we might have to delay the planned hiring by a quarter — uncomfortable but survivable.
Charlotte: And further below?
  → marked obj(s): 1
Student: If we close more than thirty percent below, we would have to revisit the entire two-year plan — at that point, the strategy isn't the same business.
Charlotte: That's the line I've been circling without naming. Do you have a sense of where your line of acceptable is?
  → marked obj(s): 2
Student: I suppose my line of acceptable would be around twenty-five percent; anything beyond that feels risky.
Charlotte: About fifteen percent below. Below that, every scenario starts to look like a different company. Contingencies, modally layered. C2 modal subtlety, complete.
```

## M20 — Word stress, sentence stress (content vs function words), weak forms (schwa), connected speech (linking, intrusive sounds, assimilation, elision), contractions, intonation

### ✓ A01 — Word stress — **100%** (3/3, 3 turns)

```
Charlotte: I noticed today that 'comfortable' is one of the words I most often stress wrong. What's a word that catches you out?
Student: For me, it's 'develop' — I used to stress the first syllable, but I've learned that natives often emphasize the second: deVELop.
Charlotte: Verbs with the de- prefix really do shift the stress. It's interesting how that works!
  → marked obj(s): 1
Student: And the suffix matters too — 'PHO-tograph' becomes 'pho-TO-graphy'; the stress migrates with the ending.
Charlotte: I'm only just starting to hear that pattern. It's fascinating how stress changes with different forms of a word!
  → marked obj(s): 2
Student: Absolutely! By the way, do natives still say all four syllables of 'comfortable,' or do they shorten it?
Charlotte: Mostly three — 'comf-tər-bəl'. The 'or' collapses almost entirely. Stress patterns, traded openly.
  → marked obj(s): 3
```

### ✓ A02 — Sentence stress and weak forms — **100%** (3/3, 4 turns)

```
Charlotte: Brazilian learners often give every syllable equal weight. What's helped you start to compress?
Student: What helped me most was reading aloud with podcasts — copying the way native speakers stress only two or three words per sentence and let the rest blur.
Charlotte: Shadowing — gold. It really helps you feel the rhythm naturally!
  → marked obj(s): 1
Student: And I started practising contractions deliberately — saying "I'm" instead of "I am" even in writing, just to feel the weight shift.
Charlotte: Writing them helps the speaking, weirdly. It really makes a difference!
  → marked obj(s): 2
Student: Absolutely, and I’ve found that listening to audiobooks and TED Talks also sharpens my ear for natural speech patterns.
Charlotte: Got it.
Student: Which audio sources do you recommend most for improving listening skills?
Charlotte: Anything conversational — interviews, podcasts where people interrupt each other. Scripted speech compresses less. Rhythm, internalised slowly.
  → marked obj(s): 3
```

### ~ A03 — Connected speech — **67%** (2/3, 3 turns)

```
Charlotte: Textbooks teach 'Did you go?' I almost never hear it that way — natives say 'didja go?' What surprised you most?
Student: For me, it was 'gonna' and 'wanna' — I had been saying 'going to' and 'want to', but natives always used the shortcuts.
Charlotte: Two of the most common verbs in English, both contracted. Have you noticed any other examples of connected speech?
  → marked obj(s): 1
Student: Yeah, I've heard 'what are you doing' often turns into 'whatcha doin' — it’s like they just drop the 't' and 'g'.
Charlotte: Got it.
  → marked obj(s): 2
Student: Absolutely, and sometimes I catch myself using those contractions, but I worry it might sound forced.
Charlotte: Start with the most casual contexts. 'Gonna' between friends. Reserve 'going to' for keynote speeches. Textbook vs reality, charted.
```

### ✓ A04 — Intonation — **100%** (3/3, 3 turns)

```
Charlotte: I've noticed that 'fine' said three different ways carries three different meanings. How do you say 'fine' when you mean it's genuinely fine?
Student: When I say 'fine' genuinely, I keep it short and neutral, like I'm just stating the weather.
Charlotte: Exactly — flat data. It conveys no emotional weight at all. How about the passive-aggressive version?
  → marked obj(s): 1
Student: When I say 'fine' in a passive-aggressive way, I stretch it out, let my pitch drop, and make it sound clipped, as if to say, 'this conversation is over and you've lost.
Charlotte: Got it.
  → marked obj(s): 2
Student: What's the third meaning you noticed?
Charlotte: Reluctant 'fine' — long, drawn out, rising slightly at the end, almost a sigh. 'I'll do it, but I want you to notice the cost.' Intonation, the silent language.
  → marked obj(s): 3
```

### ✓ A05 — Contractions and elision — **100%** (3/3, 3 turns)

```
Charlotte: You been working late again?
Student: Yeah, I've been at it since six this morning — there's a deadline I shouldn't have agreed to, and now I'm paying the price.
Charlotte: Tale as old as time. Hope you get some downtime soon!
  → marked obj(s): 1
Student: Thanks, Charlotte! I'm planning to call it a day in about an hour — wanna grab a drink if you're around?
Charlotte: Done. I'll meet you at the usual place. Just need to wrap up a couple of things first.
  → marked obj(s): 2
Student: Sounds good! How's your day been so far?
Charlotte: Long-ish, but nothing's on fire. Just the usual grind, you know?
  → marked obj(s): 3
```

## M21 — Discourse fillers (you know, I mean, like), hedge markers (kind of, sort of, basically), tag questions (isn't it? right?), backchannels (mm-hm, right, gotcha), pragmatic openers (honestly, to be fair, no offence)

### ✓ A01 — Discourse fillers — **100%** (3/3, 3 turns)

```
Charlotte: I mean, the whole thing kind of fell apart in week three. You know how it is — one decision, three weeks later, total restart.
Student: Exactly, it’s like a snowball effect; once it starts rolling, it’s hard to stop.
Charlotte: Totally! That's the tricky part. I mean, it's all about those early choices, right?
Student: I mean, week three is when those problems usually surface — early enough to be visible, late enough that pulling back feels expensive.
Charlotte: Exactly the dynamic. It’s interesting how small decisions can lead to such big consequences.
  → marked obj(s): 2, 1
Student: What was the one decision that did it for you?
Charlotte: Cutting the user research short to hit the kickoff date. Saved a week, cost six. Fillers carry register.
  → marked obj(s): 3
```

### ✓ A02 — Tag questions — **100%** (3/3, 3 turns)

```
Charlotte: The book club meets at six, doesn't it? I've forgotten if it was six or six-thirty.
Student: Yes, six, I think. Although we sometimes started at six-thirty when the host couldn't get there earlier, didn't we?
Charlotte: We did. Are you reading this month's book?
  → marked obj(s): 1
Student: You're reading the new one this month, aren't you? The one with the unreliable narrator everyone's been arguing about.
Charlotte: I'm only halfway through. It's making me angry, which is probably the point, isn't it?
  → marked obj(s): 2
Student: Are you actually enjoying it, despite the frustration?
Charlotte: Not exactly enjoying it. More like respecting against my will. Tags, native rhythm!
  → marked obj(s): 3
```

### ✓ A03 — Backchannels — **100%** (3/3, 3 turns)

```
Charlotte: So I'm at the airport last week, and the gate agent decides I need to repack my bag — in front of everyone.
Student: Oh no. Right — and you'd already been waiting how long?
Charlotte: An hour and a half. So I'm not in the mood. And she goes, 'Open it now or you're not flying.'
  → marked obj(s): 1
Student: No way. She actually made you open it in front of the whole queue?
Charlotte: She had me unpack everything. Books, toiletries, the lot. People were watching me the whole time. 😳
  → marked obj(s): 2
Student: Did you manage to catch your flight after all that?
Charlotte: Just barely. I was so relieved but still annoyed a week later. What a hassle!
  → marked obj(s): 3
```

### ✓ A04 — Pragmatic openers — **100%** (3/3, 3 turns)

```
Charlotte: One of my senior team members has been quietly disengaged for months. I don't know how to start the conversation.
Student: Honestly, the longer you wait, the harder it'll be — the disengagement starts to feel mutual once enough weeks pass.
Charlotte: That's the part I keep ignoring.
  → marked obj(s): 1
Student: You might consider saying something like, "I've noticed you've seemed a bit distant lately, and I want to understand what's going on.
Charlotte: Opening with a question, not an accusation. Yes.
  → marked obj(s): 2
Student: What do you think is actually going on with them?
Charlotte: Either burnout or quiet quitting — I'm not sure which yet. Difficult conversation, openers in place.
  → marked obj(s): 3
```

### ✓ A05 — The thing is, here's the thing — **100%** (3/3, 2 turns)

```
Charlotte: The thing is, we keep hiring brilliant people and losing them within eighteen months. I'm starting to think the issue isn't the people.
Student: Here's the thing — eighteen months is exactly the moment people realise the path they were promised isn't actually there.
Charlotte: Right at the gap between the hiring pitch and the actual ceiling.
  → marked obj(s): 2, 1
Student: What's the pattern you keep seeing in those departures?
Charlotte: They all end up at the same three companies — places that promised exactly what we couldn't deliver. It's frustrating, isn't it?
  → marked obj(s): 3
```

## M22 — Integration of all C1/C2 skills — mixed conditionals + inversion + clefts + hedging + idioms + literary craft + register fluidity + native pronunciation + pragmatic moves

### ✓ A01 — Mixed-register narrative — **100%** (3/3, 2 turns)

```
Charlotte: Three weeks later, the reply came. What did you feel reading it?
Student: Opening the email, I sensed something was off before I even read a word; it was the second sentence that truly confirmed my fears.
Charlotte: Body knew first, right? That instinct can be powerful.
  → marked obj(s): 1
Student: What surprised me was how immediately my body reacted, almost as if it had sensed the truth before my mind caught up.
Charlotte: The body keeps the better timeline. It's fascinating how our instincts often guide us first, isn't it?
  → marked obj(s): 2, 3
```

### ✓ A02 — Argumentative essay opening — **100%** (3/3, 3 turns)

```
Charlotte: Topic: the case against measuring everything. Open an op-ed paragraph.
Student: Indeed, rarely has a management orthodoxy lasted as long, or caused as much harm, as the belief that what gets measured gets managed.
Charlotte: Sharp opener. Continue.
  → marked obj(s): 1
Student: It is widely accepted that data improves decisions, but what too often goes unsaid is that bad metrics can distort the very behaviors they were meant to measure.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: Where does the op-ed go from here? Perhaps we should explore the consequences of relying too heavily on flawed metrics.
Charlotte: Into specific examples — the call centre that hit every metric while losing every customer, the school that raised test scores by narrowing what it taught. Op-ed opener, fully C2.
  → marked obj(s): 3
```

### ✓ A03 — Diplomatic conversation — **100%** (3/3, 3 turns)

```
Charlotte: I think we should let the underperforming team member go. Six months of warnings and no real change.
Student: I can see the case — six months is genuinely long, and most of the pattern data points the way you're describing.
Charlotte: But?
  → marked obj(s): 1
Student: With respect, the question I'd want answered first is whether the warnings were specific enough to act on — sometimes 'no real change' means the brief was the problem, not the person.
Charlotte: Fair. I'm not actually sure how specific they were.
  → marked obj(s): 2
Student: What did the warnings actually ask for in terms of performance improvements?
Charlotte: Honestly? Vaguer than I'd like to admit. Diplomatic register, sustained.
  → marked obj(s): 3
```

### ✗ A04 — Spontaneous casual speech — **0%** (0/3, 3 turns)

```
Charlotte: Hey, how've you been? Haven't seen you since the dinner thing.
Student: Yeah, I know — it's been months, hasn't it? I've honestly been buried under this project.
Charlotte: Same. Work's been wild. What about you? Got anything exciting going on?
Student: I've been so swamped that I can hardly remember what free time feels like!
Charlotte: Totally get that! It’s been a bit hectic for me too. Did you manage to sneak in any fun lately?
Student: I did manage to catch a movie last weekend, which felt like a breath of fresh air!
Charlotte: That sounds awesome! What movie did you see? I could use some recommendations.
  → stuck 3 turns, aborting
```

### ✓ A05 — Full synthesis — **100%** (3/3, 3 turns)

```
Charlotte: (As your manager) Walk me through your assessment of the Q1 priorities.
Student: I’d categorize our priorities into three groups: essential commitments, time-sensitive opportunities, and necessary capacity-building investments for the next two quarters.
Charlotte: (Now your peer, over coffee) OK, real version — what's actually going on?
  → marked obj(s): 1
Student: Honestly? Between us, I think half the so-called priorities are just theatre; the real issue is whether we address the engineering bottleneck or continue to ignore it.
Charlotte: (Now your closest friend, at dinner) And what's the part you can't say at work?
  → marked obj(s): 2
Student: Look, the truth is I'm tired; three quarters of running on inherited problems feels like pretending they're my new initiatives, and I don't know how much longer I can keep it up.
Charlotte: Three registers across three rooms. Curriculum complete.
  → marked obj(s): 3
```

## M23 — Professional written English — formal emails, job applications, cover letters, follow-ups, workplace messaging

### ✓ A01 — Email openings & closings — **100%** (3/3, 3 turns)

```
Charlotte: I need to email the CEO of a partner company. We've never met. What should I open with?
Student: Definitely go formal — open with 'Dear [Mr./Ms. Surname]' followed by 'I hope this email finds you well.
Charlotte: Great advice! And how do I get to the point without sounding stiff?
  → marked obj(s): 1
Student: Then a clean transition: "I'm reaching out regarding our potential collaboration on..." Keep the body tight.
Charlotte: Right. What about the close?
  → marked obj(s): 2
Student: Close with 'Kind regards,' followed by your full name and title to maintain professionalism.
Charlotte: Got it. Writing it now! 🎉 How do you feel about the email overall?
  → marked obj(s): 3
```

### ✓ A02 — Job applications — **100%** (3/3, 3 turns)

```
Charlotte: I read your draft. The opening is good. But the middle is too vague — what specifically have you done?
Student: I led a team of eight engineers to successfully migrate the platform, which ultimately reduced our infrastructure costs by 40%.
Charlotte: That's the level of specificity that gets attention! Now, can you tie that experience to the role you're applying for?
  → marked obj(s): 1
Student: That experience maps directly to your team's current focus on scalable infrastructure, as it required optimizing resources and enhancing system performance.
Charlotte: Perfect! Now, could you close it with a strong statement expressing your interest in the position?
  → marked obj(s): 2
Student: I would welcome the opportunity to discuss how I could contribute to your next phase of growth.
Charlotte: Now it reads like the candidate they want! Great job, SyntheticFelipe! What aspect of the job excites you the most?
  → marked obj(s): 3
```

### ✓ A03 — Cover letters & CVs language — **100%** (3/3, 3 turns)

```
Charlotte: Your cover letter says you 'admire the company's innovative culture'. That's filler. Be specific — what about them?
Student: What draws me to NorthPath is your commitment to open-source infrastructure — I've contributed to two of your projects on GitHub.
Charlotte: Great! Now, can you connect that to your work? How have your contributions prepared you for this role?
  → marked obj(s): 1
Student: In my current role, I've developed three open-source tools that align closely with your team's release model.
Charlotte: That's excellent! Now, can you close it with your personal motivation? Why do you want to work at NorthPath specifically?
  → marked obj(s): 2
Student: Working at NorthPath would allow me to merge my passion for open-source projects with the extensive impact and scale your platform provides.
Charlotte: Now you sound like you actually want the job — not just any job. How do you feel about your application overall?
  → marked obj(s): 3
```

### ✓ A04 — Follow-ups & check-ins — **100%** (3/3, 3 turns)

```
Charlotte: I emailed a potential client three weeks ago and never heard back. I don't want to seem pushy. Should I just give up?
Student: Just following up on my email from earlier this month could be a gentle way to reconnect without seeming pushy.
Charlotte: That's a good start! But maybe add something to re-engage them, like a relevant case study or recent news?
  → marked obj(s): 1
Student: You could say, "I came across a case study that might interest you and thought it would be worth sharing.
Charlotte: Great addition! And how about closing it? Maybe something like 'No rush on my end — just wanted to keep the conversation open'?
  → marked obj(s): 2
Student: That sounds perfect — it gives them an easy yes or an easy out!
Charlotte: Sending it now. 😊
  → marked obj(s): 3
```

### ✓ A05 — Difficult emails — **100%** (3/3, 3 turns)

```
Charlotte: I need to tell a longtime client we can't take their new project. Two years of work, but the timing isn't right. I don't want to ruin the relationship.
Student: Thank you for thinking of us for this — the relationship means a lot, but unfortunately, the timing doesn't work on our end right now.
Charlotte: Good. How honest should I be about why?
  → marked obj(s): 1
Student: You could say something like, "We're at capacity through Q3, but we truly value our partnership.
Charlotte: And how do I leave it open without overpromising?
  → marked obj(s): 2
Student: I'd suggest closing with, "I'd love to keep the conversation open for Q4 or beyond — when the timing aligns, we'd jump at the chance to work with you again.
Charlotte: OK, drafting it now. Thanks for the structure. How are you feeling about the email?
  → marked obj(s): 3
```

## M24 — High-frequency cultural idioms — expressions whose meaning is rooted in Anglo-Saxon culture and cannot be deduced from the words alone.

### ✓ A01 — Idiomas com partes do corpo — **100%** (3/3, 4 turns)

```
Charlotte: My aunt and uncle haven't spoken in five years. Family events are awkward.
Student: That sounds incredibly uncomfortable; I can only imagine how tense those family gatherings must be!
Charlotte: Tell me about it. Last year my grandmother had to seat them on opposite ends of the table. 😬
Student: Five years of giving each other the cold shoulder must make every Christmas dinner painful.
Charlotte: Tell me about it! Everyone keeps waiting for the other to start talking, but neither will. It creates such a heavy atmosphere.
  → marked obj(s): 1
Student: It seems like someone needs to bite the bullet and play mediator before the next family event becomes even more awkward.
Charlotte: Exactly! But everyone is just waiting for the other to make a move. It’s like a standoff. 😅
  → marked obj(s): 2
Student: I wonder, are either of them the kind to wear their heart on their sleeve, or do they both keep things bottled up?
Charlotte: Both are bottled-up types. That's exactly the problem.
  → marked obj(s): 3
```

### ✓ A02 — Idiomas com animais — **100%** (3/3, 3 turns)

```
Charlotte: Our director just announced a re-org, but he kept skirting around what it actually means for headcount.
Student: It's frustrating when the layoffs are the obvious elephant in the room, yet he refuses to acknowledge them.
Charlotte: Absolutely! Everyone knows what's going on, yet he just won't say it. It's like waiting for a cat to come out of the bag — it’s inevitable.
  → marked obj(s): 1
Student: I wouldn't be surprised if someone accidentally lets the cat out of the bag in a Slack channel before management makes it official — they always do.
Charlotte: It's already happening in DMs. It's like a game of telephone, but with worse consequences!
  → marked obj(s): 2
Student: Will they give the team warning before the cuts? When pigs fly — corporate transparency is a one-way street.
Charlotte: Exactly! The cynicism is earned. It’s all about keeping the upper hand, isn’t it?
  → marked obj(s): 3
```

### ✓ A03 — Idiomas de tempo e raridade — **100%** (3/3, 3 turns)

```
Charlotte: It's already August. Where did this year go? I had so many plans for things that haven't happened.
Student: I know what you mean; time really does fly when you're not looking!
Charlotte: Exactly! It's surprising how quickly the months slip away. Do you feel that with your friendships too?
  → marked obj(s): 1
Student: Absolutely, I only see most of my old friends once in a blue moon now, and I really miss those weekly coffees we used to have.
Charlotte: Same here. We promise to catch up, and then six months pass before we know it. But sometimes, the best things still happen out of the blue, don’t you think?
  → marked obj(s): 2
Student: Definitely! It's amazing how a random encounter or a good book can brighten an otherwise ordinary week.
Charlotte: That's the part to hold on to! What has been your favorite unexpected moment recently?
  → marked obj(s): 3
```

### ✓ A04 — Idiomas de decisão e ação — **100%** (3/3, 4 turns)

```
Charlotte: I've been trying to launch this side project for six months. Every time I get close, something breaks. I'm exhausted.
Student: I understand how you feel, but don't throw in the towel yet—sometimes breakthroughs come just when we least expect them.
Charlotte: Thanks, SyntheticFelipe! I keep telling myself one more push. But the breaks keep coming.
  → marked obj(s): 1
Student: Are you cutting corners somewhere you shouldn't? Sometimes those breaks signal that an earlier shortcut needs revisiting, even if it means going back to square one for one component.
Charlotte: Probably. I rushed the architecture early on. It’s frustrating to think I might have to start over with that part.
Student: It’s tough, but sometimes a solid foundation is worth the time—better to invest now than face bigger problems later.
Charlotte: I completely agree! The ball is in my court for the next decision—keep pushing, redesign one piece, or pause for a month. What do you think I should do?
Student: I think taking a step back to redesign could save you time in the long run—it's better to get it right than to rush ahead.
Charlotte: Pause for a month. I'll redesign during the break. Thanks for your support, it means a lot!
  → marked obj(s): 2, 3
```

### ✓ A05 — Idiomas conversacionais — **100%** (3/3, 3 turns)

```
Charlotte: The board presentation went so much better than I expected. I was dreading it for weeks.
Student: Absolutely! It’s funny how the things we dread for weeks often turn out to be a piece of cake.
Charlotte: Right? I have no idea why I worried.
  → marked obj(s): 1
Student: You know, breaking the ice with the board can really set the tone; how did you manage that first thirty seconds?
Charlotte: I opened with a single chart and let it speak. No preamble.
  → marked obj(s): 2
Student: Speak of the devil — your assistant just walked in with what looks like the board's written feedback; hopefully, someone hit the nail on the head with the praise!
Charlotte: Let me open it now.
  → marked obj(s): 3
```

---

## Summary

- ✓ 100%: **91** units
- ~ 67-99%: **18** units
- ✗ <67%: **12** units
- Total: 121 units

Average score: **88%**

### Failed units (sorted by score)

- **M06/A02** (0%) — Built in 1900
- **M22/A04** (0%) — Spontaneous casual speech
- **M01/A02** (33%) — Present state, past result
- **M03/A04** (33%) — It wasn't until
- **M05/A03** (33%) — Have something done
- **M06/A01** (33%) — Walking down the street
- **M06/A04** (33%) — Having been told
- **M06/A05** (33%) — Reduced relatives + with-clauses
- **M15/A02** (33%) — Gloss over, crop up, single out
- **M16/A05** (33%) — Conversion
- **M17/A04** (33%) — Do so / do it / do that
- **M18/A04** (33%) — Old information first

### Partial units

- **M01/A01** (67%) — Past condition, present result
- **M02/A05** (67%) — Under no circumstances
- **M03/A01** (67%) — It was X who
- **M03/A02** (67%) — What I need is
- **M04/A01** (67%) — I suggest that he be
- **M07/A04** (67%) — Warn against, talk into
- **M08/A04** (67%) — One might say, In a sense
- **M10/A02** (67%) — That said, mind you
- **M10/A04** (67%) — Above all, what's more
- **M10/A05** (67%) — All things considered, hence
- **M11/A02** (67%) — Commence, ascertain, demonstrate
- **M13/A02** (67%) — Anticipating counterargument
- **M14/A03** (67%) — Vivid verbs, specific nouns
- **M14/A04** (67%) — Sentence rhythm and fragments
- **M16/A02** (67%) — Suffixes for nouns
- **M18/A03** (67%) — The former, the latter, such
- **M19/A05** (67%) — Modal layering
- **M20/A03** (67%) — Connected speech