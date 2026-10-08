# Synthetic Student — Guided Chats Report

- Level: **Advanced**
- API: https://charlotte.hubacademybr.com
- Student profile: good
- Generated: 2026-06-09T13:21:57.112Z
- Max turns/chat: 8

## M01 — Mixed conditionals + counterfactuals + inversion in conditionals + alternatives to "if"

### ✓ A01 — Past condition, present result — **100%** (3/3, 3 turns)

```
Charlotte: Looking back, what's one decision from years ago that completely shapes your present?
Student: If I hadn't taken that job overseas, I wouldn't have developed my language skills as much as I have today.
Charlotte: Languages are such a powerful tool! What else flows from that experience?
  → marked obj(s): 1
Student: Had I not embraced that opportunity, I might still be struggling with my confidence in speaking.
Charlotte: Sounds good.
  → marked obj(s): 2
Student: What about you, Charlotte? What pivotal moment shaped your journey?
Charlotte: If I hadn't quit law school, I'd be billing hours instead of teaching. Decisions echo.
  → marked obj(s): 6
```

### ✓ A02 — Present state, past result — **100%** (3/3, 3 turns)

```
Charlotte: If I weren't such a planner, I would have backpacked through Asia in my twenties. What about you?
Student: If I hadn't been so focused on my studies, I might have traveled more during college.
Charlotte: That's a great example! Focusing on studies can lead to different opportunities. But if you had traveled more, how do you think it would have changed your experiences?
  → marked obj(s): 1
Student: But if I had traveled more, I might have developed a broader perspective on different cultures.
Charlotte: Absolutely! It’s fascinating how experiences shape our views. If I weren't so cautious, I would have taken more risks in my early career. Do you think caution can hold us back?
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: Do you regret it?
Charlotte: Sometimes, on slow Sundays. Mostly no. Character is its own counterfactual. What about you? Do you have any regrets?
  → marked obj(s): 3
```

### ✗ A03 — Had I known (inverted) — **0%** (0/3, 1 turns)

```
Charlotte: Imagine writing to your younger self. Had you known what you know now, what would you have done differently?
  [persona-fallback] empty -> hint_en
Student: Had I trusted my instincts, I would have left that job sooner.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✓ A04 — Were I to, Should you — **100%** (3/3, 3 turns)

```
Charlotte: Were I to propose a meeting next week, would your team be open to it?
Student: Should the timing be convenient, we would be happy to participate.
Charlotte: What flexibility do you have on timing?
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: Should the agenda allow, we'd be glad to attend.
Charlotte: Were the meeting moved to Wednesday, we could send two representatives.
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Would Tuesday afternoon work?
Charlotte: Tuesday after three. Correspondence drafted.
  → marked obj(s): 3
```

### ✗ A05 — Suppose, But for, Unless — **0%** (0/3, 1 turns)

```
Charlotte: Suppose money weren't an issue — what would you do for the rest of your life?
  [persona-fallback] empty -> hint_en
Student: Without that constraint, I'd open a small bookstore.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

## M02 — Inversion after negative/restrictive adverbials, time inversions, "only" inversions, emphatic inversions

### ✓ A01 — Never have I — **100%** (3/3, 3 turns)

```
Charlotte: Never have I laughed as hard as I did at that wedding last summer. Your turn — top a rare moment.
Student: Never have I experienced such a breathtaking view from the mountain peak.
Charlotte: Nature can be so inspiring! Anything else rare you've encountered?
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: Never have I cried so much at a film.
Charlotte: Cinema can break us open. Rarely do strangers make me feel that welcome. How about you?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: What's your rarest?
Charlotte: Seldom have I felt prouder than the day my student passed his oral exam. Emphasis carries weight.
  → marked obj(s): 3
```

### ✗ A02 — Hardly had I, No sooner had I — **0%** (0/3, 1 turns)

```
Charlotte: No sooner had I sat down to write than the doorbell rang. What's your worst day-from-hell sequence?
  [persona-fallback] empty -> hint_en
Student: No sooner had I left the house than I realised I'd forgotten my keys.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✗ A03 — Not only, Not until — **0%** (0/3, 1 turns)

```
Charlotte: Not only did my grandmother raise five children alone, but she also went back to school at 50. Top that — or layer your own.
  [persona-fallback] empty -> hint_en
Student: Not only did my dad teach himself English, but he also learned coding at 60.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✓ A04 — Only after, Little did I know — **100%** (3/3, 3 turns)

```
Charlotte: Only by failing my first big presentation did I learn how to prepare. What unlocked something for you?
Student: Only after I faced a major setback did I realize the importance of time management.
Charlotte: Some lessons cost too much. Anything that sneaked up on you?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Little did I know that one email would lead to a new career.
Charlotte: The sliding-doors moments. What’s your foreshadowing moment?
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: What's your foreshadowing moment?
Charlotte: Little did I know that a borrowed book would set my whole reading life. Hindsight, well dressed.
  → marked obj(s): 3
```

### ✗ A05 — Under no circumstances — **0%** (0/3, 1 turns)

```
Charlotte: At no time did our team approve this campaign. How would you defend that publicly?
  [persona-fallback] empty -> hint_en
Student: In no way does this campaign reflect our values.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

## M03 — It-clefts, wh-clefts (pseudo-clefts), reverse pseudo-clefts, all-clefts

### ✗ A01 — It was X who — **0%** (0/3, 1 turns)

```
Charlotte: Who actually built your team's first product?
  [persona-fallback] empty -> hint_en
Student: It was a small founding team of three who built it.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✓ A02 — What I need is — **100%** (3/3, 3 turns)

```
Charlotte: What's actually missing from your week right now?
  [persona-fallback] empty -> hint_en
Student: What I need is two hours of uninterrupted focus.
Charlotte: That's a common need! Anything that's caught you off guard recently?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: What surprised me was how much I missed silence.
Charlotte: Got it.
  → marked obj(s): 2
Student: What's missing from yours?
Charlotte: What I need is one weekend without a notification. Needs named, plainly.
  → marked obj(s): 3
```

### ✓ A03 — All I want is — **100%** (3/3, 3 turns)

```
Charlotte: All I want from this year is fewer commitments and deeper ones. What's yours?
  [persona-fallback] empty -> hint_en
Student: All I want is to feel less rushed in the mornings.
Charlotte: Small thing, huge payoff. How are you doing it?
  → marked obj(s): 1
Student: All I did was start waking up ten minutes earlier.
Charlotte: Sure!
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: What did you actually change?
Charlotte: All I did was stop checking my phone before coffee. Essentials only.
  → marked obj(s): 3
```

### ✓ A04 — It wasn't until — **100%** (3/3, 3 turns)

```
Charlotte: It wasn't until my mid-thirties that I started taking sleep seriously. What came to you late?
  [persona-fallback] empty -> hint_en
Student: It wasn't until I lost a friend that I started replying to texts on the same day.
Charlotte: Grief teaches what nothing else will. Another?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: It wasn't until I tried therapy that I noticed how angry I was.
Charlotte: Sounds good.
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: What flipped the switch on sleep for you?
Charlotte: A weekend without coffee. I crashed at 8 and woke up reborn. Late, not lost.
  → marked obj(s): 3
```

### ✗ A05 — The reason is, The thing that — **0%** (0/3, 1 turns)

```
Charlotte: The reason I became a teacher is that I had one great one as a kid. What's a 'the reason' for you?
  [persona-fallback] empty -> hint_en
Student: The reason I write every morning is that I think better when nobody's watching.
[API-ERR] API error 500: {"error":{"code":"500","id":"3feFxuZZuiLXqhbE9i0gPfwVXEUGJA7t","message":"Internal Server Error"}}

```

## M04 — Mandative subjunctive (suggest/insist/demand that he be), past subjunctive (were across persons), "lest", fossilised subjunctive

### ✗ A01 — I suggest that he be — **0%** (0/3, 1 turns)

```
Charlotte: The committee is reviewing our hiring practices. What would you recommend?
  [persona-fallback] empty -> hint_en
Student: I recommend that every candidate be interviewed by at least three panel members.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✗ A02 — It is essential that — **0%** (0/3, 1 turns)

```
Charlotte: We're writing the employee handbook. What's the first non-negotiable principle?
  [persona-fallback] empty -> hint_en
Student: It is essential that every voice be heard in team decisions.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✓ A03 — I wish I were — **100%** (3/3, 2 turns)

```
Charlotte: I wish I were the kind of person who actually enjoys mornings. Are you a morning person?
  [persona-fallback] empty -> hint_en
Student: I wish I were less attached to my phone.
Charlotte: Different fault line, same regret. Anything you'd change?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: If I were braver, I'd already have deleted the apps.
Charlotte: Sure!
  → marked obj(s): 2, 4
```

### ✓ A04 — Lest, So be it — **100%** (3/3, 2 turns)

```
Charlotte: Be that as it may, learning a language in your forties is no joke. What's your take?
  [persona-fallback] empty -> hint_en
Student: Come what may, I'm not stopping until I can read novels in English.
Charlotte: Novels are the long game. What's the friction?
  → marked obj(s): 2, 1
  [persona-fallback] empty -> hint_en
Student: How do you keep yours sharp?
Charlotte: I read aloud, write badly, and ask dumb questions. Essay drafted in old idiom.
  → marked obj(s): 3
```

### ✗ A05 — Mixed subjunctive — **0%** (0/3, 1 turns)

```
Charlotte: A senior colleague keeps missing deadlines. What would you propose, and how would you handle it personally?
  [persona-fallback] empty -> hint_en
Student: I would recommend that we establish clearer ownership for each deliverable.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

## M05 — Impersonal passive (It is said that...), double passive (He is said to be...), causative have/get, passive with reporting verbs

### ✗ A01 — It is said that — **33%** (1/3, 2 turns)

```
Charlotte: It is reported that AI will reshape half of all jobs within a decade. What's your read?
  [persona-fallback] empty -> hint_en
Student: It is believed that most jobs will change rather than disappear.
Charlotte: Reshape vs replace — important distinction. Anything you'd add?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: It cannot be denied that adaptation will be uneven across industries.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✓ A02 — He is said to be — **100%** (3/3, 2 turns)

```
Charlotte: The CEO of that startup is said to be in talks with three buyers. What else have you heard?
Student: I’ve heard that two of the cofounders are thought to be against the sale.
Charlotte: Internal friction makes deals collapse. What about past actions?
  → marked obj(s): 2, 1
  [persona-fallback] empty -> hint_en
Student: Any names yet?
Charlotte: Two — both household names. The column is drafted!
  → marked obj(s): 3
```

### ✗ A03 — Have something done — **33%** (1/3, 2 turns)

```
Charlotte: I just had my bike serviced — saved me a hundred euros. What have you outsourced lately?
  [persona-fallback] empty -> hint_en
Student: I had my taxes done by an accountant this year.
Charlotte: Some things are worth the fee. What else do you need to have done soon?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: I need to have my passport renewed before the trip.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✓ A04 — Get yourself done — **100%** (3/3, 2 turns)

```
Charlotte: Last month I had my passport lost by an airline. Worst part: they offered a coupon. What's your recent disaster?
  [persona-fallback] empty -> hint_en
Student: I had my package marked as delivered when it never arrived.
Charlotte: The phantom delivery — modern classic. I had my reservation cancelled at the last minute. What about you?
  → marked obj(s): 2, 1
  [persona-fallback] empty -> hint_en
Student: How did you sort the passport?
Charlotte: Three weeks, four calls, one consulate. Minor agonies, mutual.
  → marked obj(s): 3
```

### ✗ A05 — Mixed passive register — **0%** (0/3, 1 turns)

```
Charlotte: It is widely reported that one of our competitors is about to be acquired. What's your view?
  [persona-fallback] empty -> hint_en
Student: Their CFO is said to have already met with three potential buyers.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

## M06 — Participle clauses — present (-ing), past (-ed), perfect (Having + past participle), perfect passive (Having been + past participle), with-clauses

### ✗ A01 — Walking down the street — **33%** (1/3, 2 turns)

```
Charlotte: Walking past my old school last week, I felt fifteen all over again. What did your last walk make you feel?
Student: Strolling through the park yesterday, I remembered all the carefree summers spent there as a child.
Charlotte: Nostalgia can be so powerful. Walking through familiar places often brings back those sweet memories.
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Crossing the bridge, I realised I hadn't done that walk in years.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✓ A02 — Built in 1900 — **100%** (3/3, 2 turns)

```
Charlotte: Founded by a former monk, the little bookshop on my street has been there for forty years. Tell me about a place near you.
  [persona-fallback] empty -> hint_en
Student: Built in the 1930s, my building has the kind of doors they don't make anymore.
Charlotte: Old doors carry the weight of every family who passed through them. It's fascinating how spaces hold history, isn't it?
  → marked obj(s): 2, 1
  [persona-fallback] empty -> hint_en
Student: Does the monk still work there?
Charlotte: He died three years ago. His son runs it now. Places and people, opened in passive.
  → marked obj(s): 3
```

### ✓ A03 — Having finished — **100%** (3/3, 3 turns)

```
Charlotte: Having taught for fifteen years, I finally feel I'm starting to understand my students. What's something experience clarified for you?
  [persona-fallback] empty -> hint_en
Student: Having managed people for ten years, I finally learned to stop solving for them.
Charlotte: Hardest leadership lesson there is. Having said that, every team still finds a way to surprise me.
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Having said that, every team still finds a way to surprise me.
Charlotte: Got it.
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: What did students teach you?
Charlotte: That confusion is information, not failure. Experience, properly placed.
  → marked obj(s): 3
```

### ✗ A04 — Having been told — **0%** (0/3, 1 turns)

```
Charlotte: Having been mentored by one careful teacher in my twenties, I still hear her edits when I write. Who shaped you most?
  [persona-fallback] empty -> hint_en
Student: Having been taught patience by my grandfather, I find rushing strange.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✗ A05 — Reduced relatives + with-clauses — **33%** (1/3, 2 turns)

```
Charlotte: The café, packed with morning regulars and warmed by the smell of fresh bread, was where I made the call. Where did you make a big call recently?
  [persona-fallback] empty -> hint_en
Student: The park, lit only by a single streetlight, is where I called my mother.
Charlotte: Open air and a hard conversation.  How did you feel after that call?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: With my heart pounding, I told her the news.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

## M07 — Advanced reporting verbs (apologise for, accuse of, suggest doing, admit + ing), reported emotions, hedged reports, "according to + X"

### ~ A01 — Apologise for, accuse of — **67%** (2/3, 3 turns)

```
Charlotte: My colleague accused me of leaking the meeting notes. What would you have done?
  [persona-fallback] empty -> hint_en
Student: I would have apologised for any role in the misunderstanding, then asked for evidence.
Charlotte: Calm response under attack — that's the move. What do you think caused the misunderstanding?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: I'd blame the lack of clear ownership for situations like this.
Charlotte: Cool.
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: What did you actually do?
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ~ A02 — Admit, deny, suggest — **67%** (2/3, 3 turns)

```
Charlotte: I have to admit dreading Mondays for the first time in years. What's something you'd admit?
Student: I have to admit feeling overwhelmed by my to-do list lately.
Charlotte: That's completely understandable! I often feel the same way. I'd suggest prioritizing tasks to make it more manageable.
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: I'd suggest leaving the phone in another room for the first hour.
Charlotte: Nice.
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: What changed about Mondays?
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✓ A03 — Promise, refuse, offer — **100%** (3/3, 3 turns)

```
Charlotte: My doctor offered to refer me to a specialist, and I refused to make the appointment for two weeks. Classic me. What have you promised or refused lately?
  [persona-fallback] empty -> hint_en
Student: I promised to call my mother every Sunday, and so far I've kept it.
Charlotte: Best kind of promise! What about a refusal?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: I refused to take work calls after eight PM, and it changed my evenings.
Charlotte: Sounds good.
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: Why did you delay?
Charlotte: The diagnostic uncertainty. Avoidance, basically. Commitments, with patterns held.
  → marked obj(s): 3
```

### ✗ A04 — Warn against, talk into — **0%** (0/3, 1 turns)

```
Charlotte: My grandmother talked me into studying abroad — best decision I never planned. Who shaped a big call of yours?
  [persona-fallback] empty -> hint_en
Student: My old boss talked me into applying for a role I thought was too senior.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✓ A05 — According to, allegedly — **100%** (3/3, 2 turns)

```
Charlotte: Apparently, the company is restructuring next month. Have you heard anything more?
  [persona-fallback] empty -> hint_en
Student: According to a colleague, three teams are being merged.
Charlotte: Mergers always look cleaner on paper. Have you heard any other updates about this situation?
  → marked obj(s): 2, 1
  [persona-fallback] empty -> hint_en
Student: Where did you hear it?
Charlotte: I heard it from a friend in HR. Allegedly, the details are still being finalized. What about you? Any insights?
  → marked obj(s): 3
```

## M08 — Modal hedging, softening for delicate communication, vague language, distancing devices, polite disagreement

### ✓ A01 — I was wondering if — **100%** (3/3, 3 turns)

```
Charlotte: You wanted to talk. What's on your mind?
  [persona-fallback] empty -> hint_en
Student: I was wondering if you could give me feedback on my proposal before Friday.
Charlotte: I have time tomorrow afternoon. What specifically would you like me to focus on?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: I was hoping for your view on which sections to prioritise.
Charlotte: Send me the latest draft this evening, and I'll take a look.
  → marked obj(s): 2
Student: Thank you for taking the time to help me with this.
Charlotte: Of course! I'm glad to assist. What else is on your mind?
  → marked obj(s): 3
```

### ✗ A02 — It might be worth — **0%** (0/3, 1 turns)

```
Charlotte: I drafted a one-page project summary. Anything you'd tweak?
  [persona-fallback] empty -> hint_en
Student: It might be worth clarifying who the primary audience is.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✓ A03 — With respect, I'd see it differently — **100%** (3/3, 3 turns)

```
Charlotte: Remote work has run its course. People are more productive in offices. Don't you think?
Student: With respect, the productivity data hasn't really shown that.
Charlotte: It depends on the study, though. Some suggest that in-person work boosts collaboration and creativity. What do you think?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: I take your point about collaboration, but most of that happens through screens anyway now.
Charlotte: Fair — I'm working from instinct, not data. There’s definitely a shift in how we interact. What’s making you think that remote collaboration is more effective?
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: What's making you think this?
Charlotte: My own loneliness, probably. I feel like the energy of a physical office can really drive motivation and connection. What do you think?
  → marked obj(s): 3
```

### ✓ A04 — One might say, In a sense — **100%** (3/3, 2 turns)

```
Charlotte: It could be argued that working less actually makes us more productive. Your read?
  [persona-fallback] empty -> hint_en
Student: In a sense, focus matters more than hours.
Charlotte: Absolutely! It seems that a concentrated effort can yield greater results than simply clocking in more hours. What do you think?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Arguably, the four-day week works only in certain industries.
Charlotte: Yes — services and care work resist it. Would you say there are specific examples that highlight this?
  → marked obj(s): 4, 2
```

### ~ A05 — Sort of, more or less — **67%** (2/3, 3 turns)

```
Charlotte: How many meetings did you have this week? Roughly?
  [persona-fallback] empty -> hint_en
Student: I had about twelve, give or take the ones that got cancelled.
Charlotte: Cancellations are the only good meetings. How did that leave you feeling?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: I'm sort of fried but sort of proud of what we got done.
Charlotte: The week-end mood par excellence. More or less, how did your week go overall?
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: More or less, the week went the way I planned.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

## M09 — High-frequency idioms, body/animal/food idioms, dead vs live metaphor, similes, idioms by register

### ~ A01 — Hit the nail on the head — **67%** (2/3, 3 turns)

```
Charlotte: Our retention numbers slipped last quarter. The CEO thinks it's compensation, but I'm not so sure.
Student: Charlotte, compensation might just be the tip of the iceberg — the real issue could lie with management practices.
Charlotte: That's a harder pill for the CEO to swallow. What else do you think is affecting retention?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: The elephant in the room is that people don't believe leadership listens.
Charlotte: Cool.
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: What does your gut say?
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ~ A02 — Bite the bullet, cold feet — **133%** (4/3, 2 turns)

```
Charlotte: I bit the bullet last year and told my parents I wasn't going back into medicine. Have you ever had to deliver hard news?
  [persona-fallback] empty -> hint_en
Student: I bit the bullet and told my boss I wanted to step back from leadership.
Charlotte: Career courage! Did you hesitate at all before having that conversation?
  → marked obj(s): 2, 1
  [persona-fallback] empty -> hint_en
Student: How did your parents take it?
Charlotte: Quietly at first, then sadly, then fine. Hard moments, idiomatically held. What about you?
  → marked obj(s): 6, 3
```

### ~ A03 — Piece of cake, spill the beans — **67%** (2/3, 2 turns)

```
Charlotte: Someone leaked the salary bands to the whole company on Friday. Chaos all weekend.
  [persona-fallback] empty -> hint_en
Student: Whoever spilled the beans must have known the timing would hit hard.
Charlotte: Absolutely! Friday afternoon — never an accident. It’s like they wanted to stir the pot before the weekend!
  → marked obj(s): 2, 1
  [persona-fallback] empty -> hint_en
Student: How is HR handling it?
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✓ A04 — Two birds with one stone — **100%** (3/3, 2 turns)

```
Charlotte: I've sent over the full brief. Where do we go from here?
  [persona-fallback] empty -> hint_en
Student: Now the ball is in my team's court — we'll review and come back with edits by Wednesday.
Charlotte: Perfect cadence. Anything to combine?
  → marked obj(s): 2, 1
  [persona-fallback] empty -> hint_en
Student: What's the highest priority for you?
Charlotte: The tone of the executive summary. We need to be on the same page there. Handoff cleanly framed.
  → marked obj(s): 3
```

### ✓ A05 — Crystal clear, low-hanging fruit — **100%** (3/3, 2 turns)

```
Charlotte: Leaving the corporate job felt like the end of the world at the time. In retrospect, blessing in disguise. Have you had a moment like that?
  [persona-fallback] empty -> hint_en
Student: Getting laid off in 2020 turned out to be a blessing in disguise — I started the consulting work I'd been afraid to try.
Charlotte: Forced choices sometimes reveal the right one.
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Independence is a double-edged sword — full agency, but also full responsibility for finding the next project.
Charlotte: Nice.
  → marked obj(s): 2, 4
```

## M10 — Advanced discourse markers — nuance (in fact, as a matter of fact), concession (that said, mind you), reformulation (in other words, put differently), topic shifts (incidentally, by the way), emphatic chains (what's more, not least, above all)

### ~ A01 — In fact, as a matter of fact — **67%** (2/3, 2 turns)

```
Charlotte: People keep saying remote work has killed productivity. Your read?
  [persona-fallback] empty -> hint_en
Student: Actually, most measured studies show productivity rose or held steady, not fell.
Charlotte: And the counter-narrative?
  → marked obj(s): 2, 1
  [persona-fallback] empty -> hint_en
Student: Who's saying it?
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✓ A02 — That said, mind you — **100%** (3/3, 2 turns)

```
Charlotte: AI is going to make most knowledge work obsolete in a decade. Hard truth.
  [persona-fallback] empty -> hint_en
Student: There's something to that. That said, 'most' is doing a lot of work in that sentence.
Charlotte: Fair pushback. What survives?
  → marked obj(s): 2, 1
  [persona-fallback] empty -> hint_en
Student: What's the strongest counter you'd make to yourself?
Charlotte: That capability and adoption are two different timelines. Position complicated, fairly.
  → marked obj(s): 3
```

### ~ A03 — In other words, put differently — **67%** (2/3, 3 turns)

```
Charlotte: We're optimising for asymmetric upside in a thin market with low capital intensity. Make sense?
  [persona-fallback] empty -> hint_en
Student: In other words, you're chasing big wins in a small market without spending much money to play.
Charlotte: That's it, in twelve fewer syllables. 😊
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Put differently — you want to find the few customers who'll pay a lot, without burning cash to find them.
Charlotte: Exactly.
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: Have I got it right?
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✓ A04 — Above all, what's more — **100%** (3/3, 2 turns)

```
Charlotte: You chose to stay in your current job instead of taking a fancier offer. Why?
  [persona-fallback] empty -> hint_en
Student: The work itself still excites me. What's more, my manager has actually been listening to my career goals.
Charlotte: Rare. What else?
  → marked obj(s): 2, 1
Student: Above all, I value the team culture here — it really feels like a family.
Charlotte: That's a solid reason! Not least, the relationships you've built take time to foster, right?
  → marked obj(s): 3
```

### ~ A05 — All things considered, hence — **67%** (2/3, 3 turns)

```
Charlotte: How would you sum up the year, on balance?
  [persona-fallback] empty -> hint_en
Student: On balance, the year was harder than the last one but more meaningful.
Charlotte: Meaning and ease rarely arrive together. What underneath?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Granted, two big bets failed. That said, the lesson from each was probably worth the cost. Above all, I learned where my actual limits are.
Charlotte: Sounds good.
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: How would you sum up yours?
[API-ERR] API error 500: {"error":{"code":"500","id":"3feFxuZZuiLXqhbE9i0gPfwVXEUGJA7t","message":"Internal Server Error"}}

```

## M11 — Word connotation (positive/negative/neutral), formal vs informal register, euphemism, loaded language, litotes and hyperbole, code-switching

### ✗ A01 — Assertive or pushy? — **33%** (1/3, 2 turns)

```
Charlotte: My new director is — I don't know — really direct? Maybe too direct. I can't decide if I admire it or it's exhausting.
Student: If you admire it, she’s likely more straightforward than abrasive — clear without making you feel defensive.
Charlotte: That’s a good way to put it! There is room in her directness, mostly. 🤔
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: If it's exhausting, the line you're feeling is between assertive and pushy — when directness stops leaving room for the other person.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✓ A02 — Commence, ascertain, demonstrate — **100%** (3/3, 3 turns)

```
Charlotte: I wrote: 'We're going to kick off the new programme and look into the feedback we got.' That feels too casual for the audience. Fix?
Student: Try: "We will initiate the new programme and examine the feedback we received.
Charlotte: Better. Can it go further?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: If you want it even more formal, 'investigate' becomes 'ascertain the substance of the feedback'.
Charlotte: Got it.
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: How formal is the audience?
Charlotte: Board members and one regulator. Register, deliberately tuned.
  → marked obj(s): 3
```

### ~ A03 — Pass away, between jobs — **133%** (4/3, 3 turns)

```
Charlotte: An old friend's father passed away last week. I'm not sure what to write in the card.
Student: You could say, "I'm so sorry to hear about your father's passing; I'm thinking of you during this difficult time.
Charlotte: That's a thoughtful opener! What do you think about adding something to express your support or memories?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: If you want to mention specifics, something like: 'I know he meant the world to you, and you'll be in my thoughts as you navigate this.'
Charlotte: Cool.
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: How close are you to her?
Charlotte: Close enough that silence would hurt, distant enough that I shouldn't write a novel. Card drafted, weight respected.
  → marked obj(s): 6, 3
```

### ~ A04 — Not bad, no small feat — **67%** (2/3, 3 turns)

```
Charlotte: Saw a film last night — let's say it wasn't a complete waste of two hours. How was your week?
  [persona-fallback] empty -> hint_en
Student: Not without its moments — got through three deadlines and only one of them tried to kill me.
Charlotte: A respectable casualty count. What got through?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Finishing the redesign in a week was no small feat — and I wouldn't say no to a quiet weekend now.
Charlotte: Got it.
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: What was the film?
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✗ A05 — Code-switching — **33%** (1/3, 2 turns)

```
Charlotte: (As your manager) I understand you have concerns about the timeline. Walk me through them.
  [persona-fallback] empty -> hint_en
Student: I appreciate the opportunity to share my view. My primary concern is that the current build hasn't completed a full regression cycle, which puts the launch quality at risk.
Charlotte: (Now your peer) Off the record — same question, plain English.
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Honestly? We're nowhere near ready. The tests are still failing and we're pretending they're flaky. I told the boss diplomatically. I'm telling you straight.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✗ A06 — UK vs US + Falsos cognatos cross-link — **33%** (1/3, 2 turns)

```
Charlotte: If you're writing to an American client, you should use 'elevator', 'apartment', 'vacation'. But for British clients, switch to 'lift', 'flat', 'holiday'. Which version do you default to?
  [persona-fallback] empty -> hint_en
Student: I default to American English because that's what my schoolbooks used, but I've gotten more flexible after working with British colleagues.
Charlotte: Sensible. And false cognates from Portuguese — which ones still trip you?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Honestly, 'realise' still catches me — in Portuguese 'realizar' means 'to carry out', but in English it usually means 'to understand'. I've to consciously pause.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

## M12 — Academic register — nominalisation, impersonal voice, hedged claims, citation patterns, paragraph cohesion

### ✗ A01 — Nominalisation — **0%** (0/3, 1 turns)

```
Charlotte: I've drafted: 'Companies are spending more on cybersecurity every year.' For a research paper — too plain. Help me lift it?
  [persona-fallback] empty -> hint_en
Student: Try: 'The increase in corporate cybersecurity spending has accelerated in each of the past five years.'
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✓ A02 — Impersonal voice — **100%** (3/3, 3 turns)

```
Charlotte: Here's my draft: 'I've noticed that students seem to do better when they get feedback within 24 hours. I think this is because the connection between work and response is fresh.' For a paper — too subjective. Fix?
  [persona-fallback] empty -> hint_en
Student: Try: 'The data suggest that students perform measurably better when feedback is delivered within 24 hours.'
Charlotte: Great! And what about the explanation for this observation?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: And: 'A plausible explanation is that the temporal proximity between task and response strengthens the cognitive link between effort and outcome.'
Charlotte: Nice.
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: How strong is the evidence — is this from a study or your classroom?
Charlotte: The findings are based on two small studies, complemented by a decade of teaching experience. Paragraph academically dressed.
  → marked obj(s): 3
```

### ✓ A03 — Hedged claims — **100%** (3/3, 3 turns)

```
Charlotte: I wrote: 'Our findings prove that remote workers are more productive than office workers.' For a journal — too strong. Help me dial it back?
  [persona-fallback] empty -> hint_en
Student: Try: 'Our findings suggest that, within the sample studied, remote workers demonstrated higher productivity on the measures examined.'
Charlotte: Much safer! Now, can you add a limitation to it?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: And: 'It should be noted that the effect was modest and may not generalise to roles requiring extensive in-person collaboration.'
Charlotte: Sounds good.
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: How big was the effect, actually?
Charlotte: About 4% on objective measures, more on self-report. Claim accurate, hedge fitting.
  → marked obj(s): 3
```

### ✗ A04 — Citation patterns — **33%** (1/3, 2 turns)

```
Charlotte: Smith said in 2020 that early feedback matters. I'm writing about it for my paper. How do I phrase that?
  [persona-fallback] empty -> hint_en
Student: Try: 'Smith (2020) argues that early feedback has a measurable effect on subsequent performance.'
Charlotte: And how do I link it to my own work?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Then: 'Building on Smith's (2020) framework, the present study examines whether the effect persists in longer-cycle creative tasks.'
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✓ A05 — Paragraph cohesion — **100%** (3/3, 3 turns)

```
Charlotte: My first paragraph ends: 'The intervention reduced anxiety by 23%.' How do I open the next paragraph to keep flow?
  [persona-fallback] empty -> hint_en
Student: Try: 'This reduction in anxiety, while substantial, was not uniform across subgroups.'
Charlotte: Perfect bridge to the subgroup analysis! What if I want to contrast different findings in the next section?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Or, if you're contrasting: 'By contrast, depressive symptoms showed only a marginal change over the same period.'
Charlotte: Sure!
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: How are you planning to land the conclusion?
Charlotte: With a 'Taken together' synthesis and a limitation paragraph. Discussion threaded, C2 opener landed.
  → marked obj(s): 3
```

## M13 — Building argument (claim/warrant/evidence), anticipating counterargument, rhetorical devices (anaphora, antithesis, tricolon), persuasive structure, strong conclusions

### ✗ A01 — Building the case — **33%** (1/3, 2 turns)

```
Charlotte: We're considering a four-day workweek. Build the case for trying it.
  [persona-fallback] empty -> hint_en
Student: The case for piloting a four-day workweek rests on what we already know about attention and output.
Charlotte: Three reasons?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: First, every published trial — Iceland, Belgium, New Zealand — has reported sustained or improved productivity. Second, the recruitment advantage in a tight labour market is undeniable. Most importantly, exhausted people make worse decisions, and we make a lot of decisions.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✓ A02 — Anticipating counterargument — **100%** (3/3, 3 turns)

```
Charlotte: You're proposing remote-first hiring. But isn't that just outsourcing in disguise?
Student: While some might view it that way, it's crucial to recognize that remote-first hiring prioritizes access to global talent rather than merely cutting costs.
Charlotte: Talent access is doing a lot of work in that sentence. What are your thoughts on how this impacts company culture?
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: Critics might frame it that way, but this overlooks a basic distinction: outsourcing is about cost arbitrage; remote-first hiring is about talent access. They overlap, but they are not the same.
Charlotte: Honestly, it hasn't. The deeper question is whether we are willing to define talent narrowly enough to fit inside one city — and whether that narrow definition has served us.
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: What's your next push?
Charlotte: Culture. But that's a long answer. It’s important to consider how remote work affects team dynamics and collaboration.
  → marked obj(s): 3
```

### ✗ A03 — Anaphora, antithesis, tricolon — **0%** (0/3, 1 turns)

```
Charlotte: I'm opening a conference on disability rights tomorrow. Help me draft an opener that lands.
  [persona-fallback] empty -> hint_en
Student: Try: 'We are here because rights are not granted, they are demanded. We are here because patience has limits. We are here because no one is coming to do this for us.'
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✓ A04 — Cause-and-effect chains — **100%** (3/3, 2 turns)

```
Charlotte: Why has consumer trust in news dropped so sharply?
  [persona-fallback] empty -> hint_en
Student: The shift to ad-driven revenue forced outlets to chase clicks, which in turn rewarded sensationalism over substance.
Charlotte: And from there? What happened next in this causal chain?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Sensationalism eroded credibility, which in turn fed the 'media is biased' narrative, which in turn justified consumers turning to less-edited sources.
Charlotte: Self-reinforcing collapse. From this it follows that rebuilding trust requires not better content, but a different business model — one not financed by attention.
  → marked obj(s): 2, 3
```

### ✗ A05 — Strong conclusions — **33%** (1/3, 2 turns)

```
Charlotte: The speech is on civic participation. How would you close it?
  [persona-fallback] empty -> hint_en
Student: What is at stake is not turnout, but whether we still believe collective decisions can change anything.
Charlotte: That reframes the whole talk beautifully! Now, can you articulate the choice we face?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: The choice before us is clear: re-enter the conversation as citizens, or accept the role we have been quietly assigned — as consumers of politics rather than its authors.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

## M14 — Metaphor and extended metaphor, simile patterns, personification, imagery, sentence rhythm and fragments, showing over telling

### ✓ A01 — Metaphor and simile — **100%** (3/3, 2 turns)

```
Charlotte: Take 'attention is the new oil'. Run it for three sentences — extend it without restating.
  [persona-fallback] empty -> hint_en
Student: Attention is the new oil — and we are quietly running the same playbook on it.
Charlotte: Now extend.
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Drilling deeper into private spaces, refining cruder feeds into more potent ones, pumping the surplus into political markets and consumer ones alike.
Charlotte: That last clause earns the metaphor. Sustained, not stated.
  → marked obj(s): 2, 3
```

### ~ A02 — Personification — **67%** (2/3, 3 turns)

```
Charlotte: I wrote: 'The office was empty. The lights were on. The clock said 8 p.m.' Too flat. Animate it.
  [persona-fallback] empty -> hint_en
Student: Try: 'The office held its breath in the absence of anyone to hold it for.'
Charlotte: That's the opener. What about the lights and the clock?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: And: 'The overhead lights kept their nightly vigil over no one in particular. The clock, indifferent as always, announced eight in red.'
Charlotte: Nice.
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: What mood are you going for?
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✗ A03 — Vivid verbs, specific nouns — **33%** (1/3, 2 turns)

```
Charlotte: I wrote: 'She went into the café and sat down. A man was there. He was looking at his phone.' Bring it to life.
Student: She stepped into the café, the aroma of coffee wrapping around her, and settled into a corner, where a man stared intently at his phone, oblivious to the world.
Charlotte: Now the man. Can you add more detail to him?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Then: 'In the corner, a man in a grey overcoat was hunched over his phone, thumb scrolling slowly enough to suggest he wasn't reading anything.'
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✗ A04 — Sentence rhythm and fragments — **33%** (1/3, 2 turns)

```
Charlotte: I wrote: 'When my father died I was thirty-two and I didn't know what to do and the house felt strange and nothing made sense for a long time.' All one breath. Help me break it.
  [persona-fallback] empty -> hint_en
Student: Try: 'When my father died, I was thirty-two. The house felt strange — not different, exactly, but watchful, the way a room is after someone leaves a meeting they will not return to.'
Charlotte: That image. Keep going.
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Then add: 'I did not know what to do. Nothing made sense for a long time. That was the year I learned to live with not-knowing.'
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ~ A05 — Show, don't tell — **67%** (2/3, 3 turns)

```
Charlotte: I wrote: 'She felt lonely in the new city. The apartment was empty. She missed her friends.' Three flat tells. Show them.
  [persona-fallback] empty -> hint_en
Student: Try: 'She kept the radio on while she cooked, then while she ate, then while she fell asleep. The voices of strangers, at least, didn't change.'
Charlotte: That last clause is the line. What about the empty apartment?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Then: 'The chair she bought for two had been pulled to face the window. Nobody ever needed to sit across from her.'
Charlotte: That’s perfect! Now, how can you show her missing friends?
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: Close with: 'She kept opening the group chat without typing. Sometimes she read old messages instead of writing new ones.'
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

## M15 — High-C2 phrasal verbs — separable/inseparable distinctions, multiple meanings, low-frequency but native-natural verbs

### ✗ A01 — Bring about, bring round, come round — **33%** (1/3, 2 turns)

```
Charlotte: It took my company three years to accept remote work. How would you describe that process?
  [persona-fallback] empty -> hint_en
Student: What brought about the shift was probably the talent leaving — once people quit, the policy followed.
Charlotte: Departures usually do more than memos.
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Senior leadership came round slowly — they had to lose two key hires before the policy really moved.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✓ A02 — Gloss over, crop up, single out — **100%** (3/3, 3 turns)

```
Charlotte: I read three different write-ups of the same story and got three different impressions. What does that tell you?
  [persona-fallback] empty -> hint_en
Student: Each version probably glossed over the angles inconvenient to its own audience.
Charlotte: That's a sharp observation! It's interesting how media can shape narratives. Did you notice any patterns that cropped up across the articles?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: The same two facts probably crop up in all three, but framed in completely different ways.
Charlotte: Got it.
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: Was anyone singled out across all three?
Charlotte: One name — the regulator who wouldn't comment. The silence got singled out by everyone. Coverage parsed, phrasally.
  → marked obj(s): 3
```

### ✓ A03 — Live up to, fall through, iron out — **100%** (3/3, 3 turns)

```
Charlotte: Q2 was rough — two contracts collapsed and our product didn't perform like we promised. What would you have done?
  [persona-fallback] empty -> hint_en
Student: Not living up to a public promise is the hardest thing to recover from — trust is the slowest thing to rebuild.
Charlotte: It's slower than the financial recovery, that's for sure.
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: The path back is usually quiet — iron out the technical issues, deliver a single boring quarter, and let the noise die.
Charlotte: Sounds good.
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: How did you tide the team over financially?
Charlotte: A short bridge from existing investors. Nothing dramatic — just enough to give us six months of quiet. Quarter survived, phrasally.
  → marked obj(s): 3
```

### ✗ A04 — Talk down to, wear down, shake off — **33%** (1/3, 2 turns)

```
Charlotte: I worked with someone for five years who talked down to everyone but never noticed. I tried to address it — and got nowhere.
  [persona-fallback] empty -> hint_en
Student: People who talk down to others rarely see it because the people they patronise don't push back — silence reads to them as agreement.
Charlotte: Yes. That's exactly the dynamic. It's frustrating when they don't realize the impact they're having on others.
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Five years of that kind of behaviour wears you down without you realising it — the small daily costs add up.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✗ A05 — Stem from, amount to, water down — **0%** (0/3, 1 turns)

```
Charlotte: The product team keeps missing its targets. The pattern is too consistent to be bad luck. What's your hypothesis?
  [persona-fallback] empty -> hint_en
Student: My hypothesis is that it stems from how the targets get set — too much top-down, too little capacity input.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

## M16 — Prefixes (un-, dis-, mis-, pre-, over-, under-, re-), suffixes (-tion, -ment, -ness, -ity, -able, -ise), compounds (closed/hyphenated/open), conversion (noun ↔ verb), nuanced word families

### ✓ A01 — Negation prefixes — **100%** (3/3, 3 turns)

```
Charlotte: My old colleague is really unresponsible with deadlines. Drove me mad.
Student: Small correction — it's 'irresponsible' with 'ir-' before the 'r' of 'responsible'.
Charlotte: Right. I always second-guess that one. Have you ever dealt with someone similarly irresponsible?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: And his approach to clients was unprofessional — late replies, missed details. The pattern was hard to ignore.
Charlotte: Got it.
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: Did he ever change?
Charlotte: Only after losing a major account. By then it was too late. Vocabulary calibrated.
  → marked obj(s): 3
```

### ~ A02 — Suffixes for nouns — **133%** (4/3, 3 turns)

```
Charlotte: I wrote: 'The team decided to expand, and they performed better. We grew faster than competitors.' For a board report — too active. Help me nominalise?
  [persona-fallback] empty -> hint_en
Student: Try: 'The decision to expand was followed by a measurable improvement in team performance.'
Charlotte: Stronger! Now, what about the growth aspect?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Then: 'Subsequent growth outpaced that of competitors over the same period.'
Charlotte: Now it reads like a board document! Who's the audience — internal board or shareholders?
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: Who is the audience — internal board or shareholders?
Charlotte: Shareholders. It's for a quarterly letter. Verbs to nouns, register lifted.
  → marked obj(s): 6, 3
```

### ✗ A03 — Suffixes for adjectives and verbs — **33%** (1/3, 2 turns)

```
Charlotte: I want to say someone 'can be relied on' — is the word 'relyable'?
  [persona-fallback] empty -> hint_en
Student: Close — it's 'reliable'. The 'y' in 'rely' becomes 'i' before '-able'.
Charlotte: I always second-guess that. 😅
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Same pattern: 'predict' becomes 'predictable', 'apply' becomes 'applicable' — same y→i rule when applicable.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✓ A04 — Compounds — **100%** (3/3, 3 turns)

```
Charlotte: I wrote: 'My state of the art smartphone helps me check work mail in the post office.' Anything to fix?
Student: Almost — 'state-of-the-art' should be hyphenated before a noun: 'My state-of-the-art smartphone helps me check work mail in the post office.
Charlotte: Ah — position-dependent! What about the others?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: 'Smartphone' is correctly closed, and 'post office' is correctly open — those two were already right.
Charlotte: Got it.
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: Anything else you're unsure about?
Charlotte: Actually, I'm curious about 'half-hour' vs 'half hour' — I can never remember which is correct in which context.  
Spacing audit, complete.
  → marked obj(s): 3
```

### ✗ A05 — Conversion — **0%** (0/3, 1 turns)

```
Charlotte: I told my daughter I would send her a text message later. She laughed at me.
  [persona-fallback] empty -> hint_en
Student: She probably laughed at 'send a text message' — natives just say 'I'll text you'. The noun has become its own verb.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

## M17 — Ellipsis (leaving things out), substitution with "do/so/one", "so do I" / "neither do I" patterns, "do so" vs "do it", verb-phrase ellipsis with auxiliaries

### ✓ A01 — Ellipsis after "to" — **100%** (3/3, 3 turns)

```
Charlotte: Did you ever finish that book you were reading?
  [persona-fallback] empty -> hint_en
Student: I meant to, but I got distracted by another one halfway through.
Charlotte: Same. Books are like Netflix series — three at once, none finished.
  → marked obj(s): 1
Student: I should, really — it was on my reading list for a reason.
Charlotte: Sounds good.
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: Did you finish yours?
Charlotte: I'd like to say yes. I can't. Casual ellipsis, native rhythm.
  → marked obj(s): 3
```

### ✓ A02 — So and not as substitutes — **100%** (3/3, 3 turns)

```
Charlotte: Is the new policy going through this week?
  [persona-fallback] empty -> hint_en
Student: I believe so — the legal review wrapped up yesterday.
Charlotte: Any blockers left?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Though I'm afraid there's still one signature missing from the executive sponsor — we may slip by a day.
Charlotte: Nice.
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: Will you be at the kickoff?
Charlotte: I hope so — depends on whether the sponsor finally signs. It should be an exciting event!
  → marked obj(s): 3
```

### ✓ A03 — One, ones, that of — **100%** (3/3, 3 turns)

```
Charlotte: These two jackets are basically identical. Which one would you go for?
  [persona-fallback] empty -> hint_en
Student: Honestly, I'd take the navy one — the cut sits better at the shoulders.
Charlotte: I keep looking at the navy too. It's definitely a solid choice!
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: The other one looks like it was made for someone slightly taller — the proportions are off.
Charlotte: I hadn't noticed until you said it. You've got a keen eye for details!
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: Which one do you keep coming back to?
Charlotte: The navy. The decision was made before I walked in. Substitution flows like English flows.
  → marked obj(s): 3
```

### ~ A04 — Do so / do it / do that — **67%** (2/3, 3 turns)

```
Charlotte: I made the switch to a four-day workweek last year. Several colleagues followed. Tell me about a change you made.
  [persona-fallback] empty -> hint_en
Student: I cut my caffeine in half last spring. My partner did the same a few weeks later — sympathy headaches, mostly.
Charlotte: I love when household changes ripple. It's interesting how one person's decision can inspire others. Did anyone else in your circle do so?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Two of my friends had been thinking of doing so for months — my switch seemed to give them permission.
Charlotte: Sounds good.
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: Who copied your four-day week?
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✓ A05 — So do I, neither do I — **100%** (3/3, 3 turns)

```
Charlotte: I never check email before coffee.
  [persona-fallback] empty -> hint_en
Student: Neither do I — the first hour belongs to me, not to whoever wrote at 6 a.m.
Charlotte: Coffee plus newspaper. Sacred.
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: I always read for twenty minutes before bed — and so do I, even when the day was a wreck.
Charlotte: Twenty minutes of someone else's prose is the best sleep aid I know.
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: What else do you protect?
Charlotte: Saturday mornings — no calls, no errands, just slow. So do you, I bet. Habits matched, echoes tuned.
  → marked obj(s): 3
```

## M18 — Reference chains, lexical cohesion (synonyms, hyponyms, repetition), old-information-first principle, bridging implicit links, avoiding ambiguous referents

### ✗ A01 — This, that as reference — **33%** (1/3, 2 turns)

```
Charlotte: I wrote: 'We had three problems last quarter. Costs were up. Revenue was flat. Morale dipped. We need to address them.' Feels jumpy. Help?
  [persona-fallback] empty -> hint_en
Student: Try: 'These three pressures reinforce one another in ways the leadership team hasn't yet acknowledged.'
Charlotte: That single sentence does a lot. It connects the issues and emphasizes their interrelation. Want to add a closing statement?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: And close with: 'This combination of pressures rarely resolves itself — addressing one in isolation tends to make the others worse.'
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✗ A02 — Lexical chains — **0%** (0/3, 1 turns)

```
Charlotte: I wrote: 'The CEO announced the merger. The CEO said it would close in March. The CEO refused questions. The CEO walked out.' Help me vary it.
  [persona-fallback] empty -> hint_en
Student: Try: 'The CEO announced the merger. The chief executive said it would close in March.'
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✓ A03 — The former, the latter, such — **100%** (3/3, 3 turns)

```
Charlotte: We're choosing between two strategies: aggressive expansion or careful consolidation. Which favours which moment?
  [persona-fallback] empty -> hint_en
Student: The former tends to favour markets where competitive position is still up for grabs and capital is patient.
Charlotte: Patient capital is the rarest condition. What about the latter? How does it fit into our current situation?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: The latter tends to suit moments when the underlying assets are strong but the operating model is straining under its own complexity.
Charlotte: Sounds good.
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: Which moment are you in?
Charlotte: The second, almost certainly — the assets are healthier than the operating model. Former and latter, properly placed.
  → marked obj(s): 3
```

### ~ A04 — Old information first — **133%** (4/3, 3 turns)

```
Charlotte: I wrote: 'Significant gains were produced by the new strategy. A complete restructuring of the sales team was required by these gains.' Awkward — help?
Student: Try: 'The new strategy produced significant gains, necessitating a complete restructuring of the sales team.
Charlotte: Lighter already! The information flows better now. Can you revise the second part to make it even clearer?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Then: 'These gains required a complete restructuring of the sales team.'
Charlotte: Nice.
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: What made you reach for passive first?
Charlotte: I was trying to sound formal. Turns out formal isn't the same as passive. Flow reordered.
  → marked obj(s): 6, 3
```

### ✓ A05 — Bridging and avoiding ambiguous referents — **100%** (3/3, 3 turns)

```
Charlotte: I wrote: 'The CEO met with the head of legal yesterday. She said the deal would close. They disagreed about the timeline. Now it's all in their hands.' Confusing — fix?
  [persona-fallback] empty -> hint_en
Student: Try: 'The CEO told the head of legal that the deal would close.'
Charlotte: Already clearer! Keep going.
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Continue: 'The two disagreed on the timeline. Now the decision rests with the executive team.'
Charlotte: Now every pronoun has a parent. Nice work!
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: Was the ambiguity deliberate?
Charlotte: Honestly? I think I was avoiding naming the two of them directly. Cohesion sharpened, ambiguity dispelled.
  → marked obj(s): 3
```

## M19 — Fine shades of modal meaning — certainty (must/will/should/might/may), obligation vs inference, layered modals (might have to), quasi-modals (be supposed to / be bound to / be likely to), formal modals (ought to / shall / would)

### ✓ A01 — Must, will, should — three shades of certainty — **100%** (3/3, 3 turns)

```
Charlotte: My neighbour's lights have been on all night for three nights running. Strange — she's usually asleep by ten. Theories?
Student: She might be working on something important, or perhaps she’s waiting for someone to arrive.
Charlotte: Those are both good possibilities! Do you think there's a stronger reason for her behavior?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: If it's been three nights running, something must have changed in her routine — and whatever it is, she should be exhausted by now.
Charlotte: I keep thinking of knocking but not sure I should.
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: Do you know her well enough to knock?
Charlotte: Just enough that not knocking feels worse than knocking. Inferences, properly weighted.
  → marked obj(s): 3
```

### ✗ A02 — Might well, could well, may well — **33%** (1/3, 2 turns)

```
Charlotte: Three of our biggest competitors are quietly raising prices this month. What do you make of it?
Student: It could well be a sign that they anticipate higher costs impacting their margins.
Charlotte: What does that mean for us?
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: It could well be a coordinated signal that input costs have finally moved beyond what any of them can absorb.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✓ A03 — Ought to, shall, would — **100%** (3/3, 3 turns)

```
Charlotte: Draft a clause for a service contract — what should the contractor be obliged to do?
  [persona-fallback] empty -> hint_en
Student: The contractor shall maintain professional liability insurance throughout the duration of this engagement, with coverage no less than five hundred thousand euros.
Charlotte: Standard but well-worded! And what do you think the implicit obligations ought to be?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Beyond the contract, both parties ought to communicate openly about delays — even when no specific clause requires it.
Charlotte: That's the kind of clause I never see in print but always wish for. Can you share a past habit from your experience with contracts?
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: My old mentor would always start contracts by asking what the other party most feared — that question shaped every clause after.
Charlotte: I'm going to steal that. Shall, ought, would — three eras.
  → marked obj(s): 3
```

### ✓ A04 — Be bound to, be likely to, be supposed to — **100%** (3/3, 3 turns)

```
Charlotte: The pilot launch was meant to start in March. Now I'm not sure it'll happen before June. Your read?
  [persona-fallback] empty -> hint_en
Student: If three weeks have already slipped, March is unlikely to hold — June is starting to look like the realistic baseline.
Charlotte: I keep telling stakeholders March is still possible. Maybe I shouldn't.
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: And once a date slips publicly, the next one is bound to be questioned — credibility is the hidden cost of these delays.
Charlotte: Sounds good.
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: What specifically was supposed to be ready?
Charlotte: Two integrations and a single onboarding flow. None of which are even close. Timing, modally weighed.
  → marked obj(s): 3
```

### ✓ A05 — Modal layering — **100%** (3/3, 3 turns)

```
Charlotte: If the funding round closes below target, what changes?
  [persona-fallback] empty -> hint_en
Student: If we close ten to twenty percent below target, we might have to delay the planned hiring by a quarter — uncomfortable but survivable.
Charlotte: And further below?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: If we close more than thirty percent below, we would have to revisit the entire two-year plan — at that point, the strategy isn't the same business.
Charlotte: That's the line I've been circling without naming. What do you think is an acceptable level of risk?
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: Where's your line of acceptable?
Charlotte: About fifteen percent below. Below that, every scenario starts to look like a different company. Contingencies, modally layered. C2 modal subtlety, complete.
  → marked obj(s): 3
```

## M20 — Word stress, sentence stress (content vs function words), weak forms (schwa), connected speech (linking, intrusive sounds, assimilation, elision), contractions, intonation

### ~ A01 — Word stress — **67%** (2/3, 3 turns)

```
Charlotte: I noticed today that 'comfortable' is one of the words I most often stress wrong. What's a word that catches you out?
  [persona-fallback] empty -> hint_en
Student: For me it's 'develop' — I'd always stress the first syllable until I noticed natives go to the second: deVELop.
Charlotte: Verbs with the de- prefix really do shift the stress. It's interesting how that works!
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: And the suffix matters too — 'PHO-tograph' becomes 'pho-TO-graphy'. The stress migrates with the ending.
Charlotte: I'm only just starting to hear that pattern. It's fascinating how these shifts happen!
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: Do natives still say all four syllables of 'comfortable'?
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ~ A02 — Sentence stress and weak forms — **67%** (2/3, 3 turns)

```
Charlotte: Brazilian learners often give every syllable equal weight. What's helped you start to compress?
Student: What helped me most was recording myself reading aloud and focusing on the rhythm and stress patterns of native speakers.
Charlotte: Shadowing is a fantastic technique! How did you notice your rhythm improving?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: And I started practising contractions deliberately — saying 'I'm' instead of 'I am' even in writing, just to feel the weight shift.
Charlotte: Writing them helps the speaking, weirdly. It’s interesting how that shift in style can change your rhythm. Have you found any good audio sources for this?
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: Which audio sources do you recommend most?
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✓ A03 — Connected speech — **100%** (3/3, 2 turns)

```
Charlotte: Textbooks teach 'Did you go?' I almost never hear it that way — natives say 'didja go?' What surprised you most?
  [persona-fallback] empty -> hint_en
Student: For me it was 'gonna' and 'wanna' — I'd been carefully pronouncing 'going to' and 'want to', and natives were always saying 'gonna' and 'wanna' instead.
Charlotte: Two of the most common verbs in English, both contracted. What else have you noticed about how natives speak?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: And 'what are you doing' compresses to something close to 'whatcha doin' — without the 't' of 'what' and without the 'g' of 'doing'.
Charlotte: Cool.
  → marked obj(s): 2, 4
```

### ~ A04 — Intonation — **67%** (2/3, 3 turns)

```
Charlotte: I've noticed that 'fine' said three different ways carries three different meanings. How do you say 'fine' when you mean it's genuinely fine?
  [persona-fallback] empty -> hint_en
Student: Genuine 'fine' is short, medium pitch, neutral — like reporting the weather. No emotional weight.
Charlotte: Exactly — flat data. Now, how do you say 'fine' when you're being passive-aggressive?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Passive-aggressive 'fine' is longer, falling pitch, slightly clipped — it means 'this conversation is over and you've lost'.
Charlotte: Sounds good.
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: What's the third meaning you noticed?
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✓ A05 — Contractions and elision — **100%** (3/3, 3 turns)

```
Charlotte: You been working late again?
Student: Yeah, I've been at it since six this morning — these deadlines just keep piling up.
Charlotte: Tale as old as time. You gonna call it a day soon?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: I'm gonna call it a day in about an hour — wanna grab a drink if you're around?
Charlotte: Sure!
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: How's your day been?
Charlotte: It's been alright, just the usual busy stuff. How about yours?
  → marked obj(s): 3
```

## M21 — Discourse fillers (you know, I mean, like), hedge markers (kind of, sort of, basically), tag questions (isn't it? right?), backchannels (mm-hm, right, gotcha), pragmatic openers (honestly, to be fair, no offence)

### ✓ A01 — Discourse fillers — **100%** (3/3, 2 turns)

```
Charlotte: I mean, the whole thing kind of fell apart in week three. You know how it is — one decision, three weeks later, total restart.
  [persona-fallback] empty -> hint_en
Student: I mean, week three is when those problems usually surface — early enough to be visible, late enough that pulling back feels expensive.
Charlotte: Exactly the dynamic. It's kind of one of those situations where the right answer is also the most uncomfortable one.
  → marked obj(s): 2, 1
  [persona-fallback] empty -> hint_en
Student: What was the one decision that did it?
Charlotte: Cutting the user research short to hit the kickoff date. Saved a week, cost six. Fillers carry register.
  → marked obj(s): 3
```

### ✓ A02 — Tag questions — **100%** (3/3, 2 turns)

```
Charlotte: The book club meets at six, doesn't it? I've forgotten if it was six or six-thirty.
  [persona-fallback] empty -> hint_en
Student: Six, I think. Although we sometimes started at six-thirty when the host couldn't get there earlier, didn't we?
Charlotte: We did. Are you reading this month's book, too?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: You're reading the new one this month, aren't you? The one with the unreliable narrator everyone's been arguing about.
Charlotte: I'm only halfway through. It's making me angry, which is probably the point, isn't it?
  → marked obj(s): 4, 2
```

### ✓ A03 — Backchannels — **100%** (3/3, 3 turns)

```
Charlotte: So I'm at the airport last week, and the gate agent decides I need to repack my bag — in front of everyone.
  [persona-fallback] empty -> hint_en
Student: Oh no. Right — and you'd already been waiting how long?
Charlotte: An hour and a half. So I'm not in the mood. And she goes, 'Open it now or you're not flying.'
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: No way. She actually opened it in front of the whole queue?
Charlotte: She had me unpack everything. Books, toiletries, the lot. People were watching.
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: Did you make the flight?
Charlotte: Just barely. And I'm still annoyed a week later. Story heard, story honoured.
  → marked obj(s): 3
```

### ~ A04 — Pragmatic openers — **67%** (2/3, 3 turns)

```
Charlotte: One of my senior team members has been quietly disengaged for months. I don't know how to start the conversation.
  [persona-fallback] empty -> hint_en
Student: Honestly, the longer you wait, the harder it'll be — the disengagement starts to feel mutual once enough weeks pass.
Charlotte: That's the part I keep ignoring.
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Look, the opening question matters more than the script — something like 'I've noticed something, and I want to understand what's going on' opens space.
Charlotte: Opening with a question, not an accusation. Yes.
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: What do you think is actually going on?
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✓ A05 — The thing is, here's the thing — **100%** (3/3, 2 turns)

```
Charlotte: The thing is, we keep hiring brilliant people and losing them within eighteen months. I'm starting to think the issue isn't the people.
  [persona-fallback] empty -> hint_en
Student: Here's the thing — eighteen months is exactly the moment people realise the path they were promised isn't actually there.
Charlotte: Right at the gap between the hiring pitch and the actual ceiling.
  → marked obj(s): 2, 1
  [persona-fallback] empty -> hint_en
Student: What's the pattern you keep seeing?
Charlotte: They all end up at the same three companies — places that promised exactly what we couldn't deliver. It's a tough realization.
  → marked obj(s): 3
```

## M22 — Integration of all C1/C2 skills — mixed conditionals + inversion + clefts + hedging + idioms + literary craft + register fluidity + native pronunciation + pragmatic moves

### ✗ A01 — Mixed-register narrative — **0%** (0/3, 1 turns)

```
Charlotte: Three weeks later, the reply came. What did you feel reading it?
  [persona-fallback] empty -> hint_en
Student: Opening the email, I knew before I'd read a word. It was the second sentence that confirmed it — three lines down, between the formalities and the contract details.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ~ A02 — Argumentative essay opening — **67%** (2/3, 3 turns)

```
Charlotte: Topic: the case against measuring everything. Open an op-ed paragraph.
  [persona-fallback] empty -> hint_en
Student: Rarely has a management orthodoxy lasted as long, or done as much damage in plain sight, as the conviction that what gets measured gets managed.
Charlotte: Sharp opener. Continue with your argument about data and decision-making.
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: It is widely accepted that data improves decisions, but what too often goes unsaid is that bad metrics actively make decisions worse — distorting the very behaviours they were meant to measure.
Charlotte: Sounds good.
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: Where does the op-ed go from here?
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✓ A03 — Diplomatic conversation — **100%** (3/3, 3 turns)

```
Charlotte: I think we should let the underperforming team member go. Six months of warnings and no real change.
Student: I understand your perspective — six months is indeed a considerable amount of time, and the lack of improvement is concerning.
Charlotte: But what about the potential for growth? Sometimes a little more time can lead to unexpected results.
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: With respect, the question I'd want answered first is whether the warnings were specific enough to act on — sometimes 'no real change' means the brief was the problem, not the person.
Charlotte: Fair point. I'm not actually sure how specific they were. It might be worth reviewing the actual warnings before making a decision.
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: What did the warnings actually ask for?
Charlotte: Honestly? Vaguer than I'd like to admit. It seems they were more about general performance than specific actions to improve. Diplomatic register, sustained.
  → marked obj(s): 3
```

### ✗ A04 — Spontaneous casual speech — **33%** (1/3, 2 turns)

```
Charlotte: Hey, how've you been? Haven't seen you since the dinner thing.
  [persona-fallback] empty -> hint_en
Student: Yeah, I know — it's been months, hasn't it? I've been buried under this project, honestly.
Charlotte: Same. Work's been wild. How about you? What have you been up to lately?
  → marked obj(s): 1
Student: I've been juggling a few freelance gigs; how's your workload treating you?
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✓ A05 — Full synthesis — **100%** (3/3, 3 turns)

```
Charlotte: (As your manager) Walk me through your assessment of the Q1 priorities.
  [persona-fallback] empty -> hint_en
Student: I'd group them into three categories: structural commitments we cannot defer, market opportunities with closing windows, and capacity-building investments that the next two quarters will demand. The first category, in my view, is non-negotiable for Q1; the second deserves a sharper prioritisation conversation; the third is the one we keep postponing at our peril.
Charlotte: (Now your peer, over coffee) OK, real version — what's actually going on?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Honestly? Between us — half the so-called priorities are theatre. The real Q1 question is whether we finally have the conversation about the engineering bottleneck, or whether we ride out another quarter pretending we don't have one.
Charlotte: (Now your closest friend, at dinner) And what's the part you can't say at work?
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: Look, the truth is I'm tired. Three quarters in a row of running on inherited problems and pretending they're my new initiatives. I don't know how much longer I want to keep doing it — and that's a sentence I would never say in a meeting.
Charlotte: Three rooms, three voices, one person. Curriculum complete.
  → marked obj(s): 3
```

## M23 — Professional written English — formal emails, job applications, cover letters, follow-ups, workplace messaging

### ~ A01 — Email openings & closings — **67%** (2/3, 3 turns)

```
Charlotte: I need to email the CEO of a partner company. We've never met. What should I open with?
  [persona-fallback] empty -> hint_en
Student: Definitely go formal — open with 'Dear [Mr./Ms. Surname]' followed by 'I hope this email finds you well'.
Charlotte: And how do I get to the point without sounding stiff?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Then a clean transition: 'I'm reaching out regarding our potential collaboration on...' Keep the body tight.
Charlotte: Right. What about the close?
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: Close with 'Kind regards' followed by your full name and title. Avoid 'Best' — too casual for first contact at that level.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✓ A02 — Job applications — **100%** (3/3, 3 turns)

```
Charlotte: I read your draft. The opening is good. But the middle is too vague — what specifically have you done?
Student: I led a team of eight engineers to implement a new system that improved efficiency by 30%.
Charlotte: That's the level of specificity that gets attention! Now, can you tie that experience to the job description?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: That experience maps directly to your team's current focus on scalable infrastructure.
Charlotte: Perfect! Now, let's close it with a strong statement. How would you like to express your interest in the role?
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: I would welcome the opportunity to discuss how I could contribute to your next phase of growth.
Charlotte: Now it reads like the candidate they want! I'm excited about your progress. What's next on your agenda? 🌟
  → marked obj(s): 3
```

### ~ A03 — Cover letters & CVs language — **67%** (2/3, 3 turns)

```
Charlotte: Your cover letter says you 'admire the company's innovative culture'. That's filler. Be specific — what about them?
  [persona-fallback] empty -> hint_en
Student: What draws me to NorthPath is your commitment to open-source infrastructure — I've contributed to two of your projects on GitHub.
Charlotte: Nice! Now connect that to your work. How have your contributions prepared you for this role?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: In my current role, I've built three open-source tools that align with your team's release model.
Charlotte: Great connection! Now, close it with your personal motivation. Why do you want to work at NorthPath specifically?
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: Working at NorthPath would let me combine my open-source ethos with the kind of scale your platform offers.
[API-ERR] API error 500: {"error":{"code":"500","id":"3feFxuZZuiLXqhbE9i0gPfwVXEUGJA7t","message":"Internal Server Error"}}

```

### ✓ A04 — Follow-ups & check-ins — **100%** (3/3, 3 turns)

```
Charlotte: I emailed a potential client three weeks ago and never heard back. I don't want to seem pushy. Should I just give up?
  [persona-fallback] empty -> hint_en
Student: Three weeks is the perfect window for a soft follow-up. Open with 'Just following up on my email from earlier this month'.
Charlotte: Just the same thing again?
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Add a reason to re-engage — something like 'I came across a case study that might interest you' or 'Just released something relevant'.
Charlotte: And for the closing, what should I say?
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: Close with 'No rush on my end — just wanted to keep the conversation open'. Gives them an easy yes or easy out.
Charlotte: Sending it now.
  → marked obj(s): 3
```

### ✓ A05 — Difficult emails — **100%** (3/3, 2 turns)

```
Charlotte: I need to tell a longtime client we can't take their new project. Two years of work, but the timing isn't right. I don't want to ruin the relationship.
  [persona-fallback] empty -> hint_en
Student: Open with appreciation: 'Thank you for thinking of us for this — the relationship means a lot.' Then soften the no: 'Unfortunately, the timing doesn't work on our end right now.'
Charlotte: Good points! How honest should I be about why we're declining the project?
  → marked obj(s): 1, 2
  [persona-fallback] empty -> hint_en
Student: Close with: 'I'd love to keep the conversation open for Q4 or beyond — when the timing aligns, we'd jump at the chance to work with you again.'
Charlotte: That’s a great closing! Now, what brief reason should I include for why we can't take the project?
  → marked obj(s): 3
```

## M24 — High-frequency cultural idioms — expressions whose meaning is rooted in Anglo-Saxon culture and cannot be deduced from the words alone.

### ✗ A01 — Idiomas com partes do corpo — **0%** (0/3, 1 turns)

```
Charlotte: My aunt and uncle haven't spoken in five years. Family events are awkward.
  [persona-fallback] empty -> hint_en
Student: Five years of giving each other the cold shoulder must make every Christmas dinner painful.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✗ A02 — Idiomas com animais — **33%** (1/3, 2 turns)

```
Charlotte: Our director just announced a re-org, but he kept skirting around what it actually means for headcount.
  [persona-fallback] empty -> hint_en
Student: Layoffs are the obvious elephant in the room, and his refusal to name it makes the silence worse.
Charlotte: Exactly! Everyone knew. He just wouldn't say it. It's like trying to ignore a gorilla in the room! 🦍
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Someone will accidentally let the cat out of the bag in a Slack channel before management makes it official — they always do.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

### ✓ A03 — Idiomas de tempo e raridade — **100%** (3/3, 3 turns)

```
Charlotte: It's already August. Where did this year go? I had so many plans for things that haven't happened.
  [persona-fallback] empty -> hint_en
Student: Time really does fly when you're not looking — the year between January and August disappears the moment you blink.
Charlotte: Exactly! And friendships can feel the same way. Do you find yourself catching up with friends less often these days?
  → marked obj(s): 1
Student: I do, actually; it seems like we only get together once in a blue moon these days, and I really miss those regular hangouts.
Charlotte: Same here! We promise we'll catch up and then six months pass. It's strange how life takes over, isn't it?
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: Sometimes the best things still happen out of the blue, though — the right book in the wrong week, a stranger's kindness on a hard day.
Charlotte: That's the part to hold on to. It's those unexpected moments that can really brighten our days!
  → marked obj(s): 3
```

### ✓ A04 — Idiomas de decisão e ação — **100%** (3/3, 3 turns)

```
Charlotte: I've been trying to launch this side project for six months. Every time I get close, something breaks. I'm exhausted.
  [persona-fallback] empty -> hint_en
Student: Don't throw in the towel yet — six months of effort is usually right before the breakthrough or the honest admission it's not the right project.
Charlotte: I keep telling myself one more push. But the breaks keep coming.
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: Are you cutting corners somewhere you shouldn't? Sometimes the breaks are signal that an earlier shortcut needs revisiting — even if it means back to square one for one component.
Charlotte: Probably. I rushed the architecture early on. It's frustrating to think I might have to start over in some areas.
  → marked obj(s): 2
  [persona-fallback] empty -> hint_en
Student: The ball is in your court for the next decision — keep pushing, redesign one piece, or pause for a month. Any of those is a valid move.
Charlotte: Pause for a month. I'll redesign during the break. Thanks for your support! It really helps to talk it through. 😊
  → marked obj(s): 3
```

### ✗ A05 — Idiomas conversacionais — **33%** (1/3, 2 turns)

```
Charlotte: The board presentation went so much better than I expected. I was dreading it for weeks.
  [persona-fallback] empty -> hint_en
Student: Sounds like it ended up being a piece of cake — funny how the things we dread for weeks turn out to be the easiest part.
Charlotte: Right? I have no idea why I worried.
  → marked obj(s): 1
  [persona-fallback] empty -> hint_en
Student: How did you break the ice with the board? That first thirty seconds usually decides how the rest of the room sits with you.
[API-ERR] API error 500: {"error":"429 Rate limit reached for gpt-4o-mini in organization org-d6wffkSjNqAnCjC1rr0l4REb on requests per day (RPD): Limit 10000, Used 10000, Requested 1. Please try again in 8.64s. Visit https://
```

---

## Summary

- ✓ 100%: **57** units
- ~ 67-99%: **19** units
- ✗ <67%: **41** units
- Total: 121 units

Average score: **67%**

### Failed units (sorted by score)

- **M01/A03** (0%) — Had I known (inverted)
- **M01/A05** (0%) — Suppose, But for, Unless
- **M02/A02** (0%) — Hardly had I, No sooner had I
- **M02/A03** (0%) — Not only, Not until
- **M02/A05** (0%) — Under no circumstances
- **M03/A01** (0%) — It was X who
- **M03/A05** (0%) — The reason is, The thing that
- **M04/A01** (0%) — I suggest that he be
- **M04/A02** (0%) — It is essential that
- **M04/A05** (0%) — Mixed subjunctive
- **M05/A05** (0%) — Mixed passive register
- **M06/A04** (0%) — Having been told
- **M07/A04** (0%) — Warn against, talk into
- **M08/A02** (0%) — It might be worth
- **M12/A01** (0%) — Nominalisation
- **M13/A03** (0%) — Anaphora, antithesis, tricolon
- **M15/A05** (0%) — Stem from, amount to, water down
- **M16/A05** (0%) — Conversion
- **M18/A02** (0%) — Lexical chains
- **M22/A01** (0%) — Mixed-register narrative
- **M24/A01** (0%) — Idiomas com partes do corpo
- **M05/A01** (33%) — It is said that
- **M05/A03** (33%) — Have something done
- **M06/A01** (33%) — Walking down the street
- **M06/A05** (33%) — Reduced relatives + with-clauses
- **M11/A01** (33%) — Assertive or pushy?
- **M11/A05** (33%) — Code-switching
- **M11/A06** (33%) — UK vs US + Falsos cognatos cross-link
- **M12/A04** (33%) — Citation patterns
- **M13/A01** (33%) — Building the case
- **M13/A05** (33%) — Strong conclusions
- **M14/A03** (33%) — Vivid verbs, specific nouns
- **M14/A04** (33%) — Sentence rhythm and fragments
- **M15/A01** (33%) — Bring about, bring round, come round
- **M15/A04** (33%) — Talk down to, wear down, shake off
- **M16/A03** (33%) — Suffixes for adjectives and verbs
- **M18/A01** (33%) — This, that as reference
- **M19/A02** (33%) — Might well, could well, may well
- **M22/A04** (33%) — Spontaneous casual speech
- **M24/A02** (33%) — Idiomas com animais
- **M24/A05** (33%) — Idiomas conversacionais

### Partial units

- **M07/A01** (67%) — Apologise for, accuse of
- **M07/A02** (67%) — Admit, deny, suggest
- **M08/A05** (67%) — Sort of, more or less
- **M09/A01** (67%) — Hit the nail on the head
- **M09/A03** (67%) — Piece of cake, spill the beans
- **M10/A01** (67%) — In fact, as a matter of fact
- **M10/A03** (67%) — In other words, put differently
- **M10/A05** (67%) — All things considered, hence
- **M11/A04** (67%) — Not bad, no small feat
- **M14/A02** (67%) — Personification
- **M14/A05** (67%) — Show, don't tell
- **M17/A04** (67%) — Do so / do it / do that
- **M20/A01** (67%) — Word stress
- **M20/A02** (67%) — Sentence stress and weak forms
- **M20/A04** (67%) — Intonation
- **M21/A04** (67%) — Pragmatic openers
- **M22/A02** (67%) — Argumentative essay opening
- **M23/A01** (67%) — Email openings & closings
- **M23/A03** (67%) — Cover letters & CVs language