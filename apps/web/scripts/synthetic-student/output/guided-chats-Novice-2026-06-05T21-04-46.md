# Synthetic Student — Guided Chats Report

- Level: **Novice**
- API: https://charlotte.hubacademybr.com
- Student profile: good
- Generated: 2026-06-05T21:04:46.583Z
- Max turns/chat: 8

## M19 — Will — previsões, decisões espontâneas, ofertas

### ✗ N01 — Vai chover — **0%** (0/3, 3 turns)

```
Charlotte: What will happen next year?
Student: I'll travel next year.
Charlotte: Cool. What else will happen?
Student: I'll learn new things next year.
Charlotte: Nice! What will you learn?
Student: I'll learn English next year.
Charlotte: Great choice! I love English.
  → stuck 3 turns, aborting
```

### ✗ N02 — Não vou, vou sim — **0%** (0/3, 3 turns)

```
Charlotte: Quick — I need help moving!
Student: I'll help you!
Charlotte: Awesome. When can you help?
Student: I can help you this weekend.
Charlotte: Don't forget!
Student: I won't forget!
Charlotte: Trustworthy friend! What do you want to do next?
```

### ✗ N03 — Going to vs Will — **0%** (0/3, 3 turns)

```
Charlotte: Plan something AND react to something.
Student: I'm going to plan a dinner for tomorrow.
Charlotte: Cool!
Student: I'm going to invite my friends to the dinner.
Charlotte: Nice.
Student: I'm going to cook pasta for dinner.
Charlotte: Great choice!
  → stuck 3 turns, aborting
```

### ✗ N04 — Vou te ajudar — **33%** (1/3, 3 turns)

```
Charlotte: Will you come to my party?
Student: Yes, I'll come.
Charlotte: Anything to share?
  → marked obj(s): 1
Student: I'll bring a cake.
Charlotte: Nice! Will you help me?
Student: Yes, I will help you!
Charlotte: Thank you! Best friend!
```

### ✗ N05 — Imagino que sim — **0%** (0/3, 3 turns)

```
Charlotte: Talk about your future — plans and predictions.
Student: I'm going to learn English.
Charlotte: Great! What do you think you will do?
Student: I'm going to practice every day.
Charlotte: Nice! I think I will improve.
Student: I'm going to watch English movies.
Charlotte: Nice.
  → stuck 3 turns, aborting
```

### ✓ N06 — Tempo e estações — **100%** (3/3, 3 turns)

```
Charlotte: Are you a hot weather or cold weather person?
Student: I prefer cold weather.
Charlotte: Really? Most people prefer warm. Why cold?
  → marked obj(s): 1
Student: I like cold weather because it's refreshing and cozy.
Charlotte: Right now, what is the weather?
  → marked obj(s): 2
Student: It's cold and cloudy. What about you?
Charlotte: I love summer — sunny and hot.
  → marked obj(s): 3
```

---

## Summary

- ✓ 100%: **1** units
- ~ 67-99%: **0** units
- ✗ <67%: **5** units
- Total: 6 units

Average score: **22%**

### Failed units (sorted by score)

- **M19/N01** (0%) — Vai chover
- **M19/N02** (0%) — Não vou, vou sim
- **M19/N03** (0%) — Going to vs Will
- **M19/N05** (0%) — Imagino que sim
- **M19/N04** (33%) — Vou te ajudar
