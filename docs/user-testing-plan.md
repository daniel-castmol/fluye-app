# Fluye — User Testing Plan (V2 Launch)

**Goal:** Get 10 real users testing Fluye for 5 business days, then collect structured feedback.
**Timeline:** 5 business days of usage + feedback form on Day 6.
**Target users:** People with ADHD (diagnosed or self-identified) who struggle with task initiation.

---

## Phase 1: Recruit (Before Day 1)

**Where to find testers:**
- Friends/colleagues who've mentioned ADHD struggles
- ADHD communities (Reddit r/ADHD, Twitter/X, Discord servers)
- Dev communities (many devs self-identify with ADHD)

**Onboarding message template:**

> Hey! I'm building Fluye — a free tool that helps people with ADHD break down overwhelming tasks into small, concrete steps using AI. I'm looking for 10 people to test it for a week. All you need to do is:
>
> 1. Sign up at [URL]
> 2. Use it whenever you have a task that feels "too big to start"
> 3. Answer a short form at the end of the week
>
> No commitment beyond that. Interested?

**What to share:**
- App URL
- Brief 1-liner on what it does (don't over-explain — see if the app speaks for itself)
- Let them know you'll check in once mid-week and send a form at the end

---

## Phase 2: Mid-Week Check-in (Day 2-3)

Quick async DM — not a form. Keep it casual.

> Hey! Just checking in — have you had a chance to try Fluye? Any tasks you've thrown at it? No pressure, just want to make sure everything's working smoothly for you.

**What you're listening for:**
- Did they actually use it? (activation)
- Any bugs or confusion? (hotfix opportunity)
- Emotional reaction — relief? frustration? indifference?
- If they haven't used it, ask what stopped them (friction signal)

---

## Phase 3: Observe (Days 1-5)

**Quantitative (Vercel Analytics + Supabase):**
You can run these queries in Supabase SQL Editor to track usage during the test.

```sql
-- Total users who signed up
SELECT COUNT(*) as total_users FROM "UserProfile";

-- Users who created at least 1 task (activated)
SELECT COUNT(DISTINCT "profileId") as activated_users FROM "Task";

-- Tasks per user
SELECT p.name, COUNT(t.id) as tasks_created
FROM "UserProfile" p
LEFT JOIN "Task" t ON t."profileId" = p.id
GROUP BY p.name ORDER BY tasks_created DESC;

-- Completion rate (tasks where all steps are done)
SELECT
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') / NULLIF(COUNT(*), 0), 1) as completion_rate
FROM "Task";

-- Steps completed vs total
SELECT
  COUNT(*) FILTER (WHERE completed = true) as done,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE completed = true) / NULLIF(COUNT(*), 0), 1) as step_completion_rate
FROM "TaskStep";

-- Shared tasks (virality signal)
SELECT COUNT(*) FROM "Task" WHERE "isShared" = true;

-- Daily active users (tasks created per day)
SELECT DATE("createdAt") as day, COUNT(DISTINCT "profileId") as active_users
FROM "Task" GROUP BY day ORDER BY day;
```

**What good looks like:**
- 7+ out of 10 users create at least 1 task (70% activation)
- 3+ tasks per user over the week (returning usage)
- 50%+ step completion rate (tasks are actually actionable)
- At least 1 shared task (organic virality)

---

## Phase 4: Feedback Form (Day 6)

Use Google Forms or Tally. Keep it under 5 minutes — ADHD testers won't finish a long form.

### Section 1: Core Value (Did it work?)

**Q1.** How many times did you use Fluye this week?
- Once
- 2-3 times
- 4-5 times
- Daily

**Q2.** Think of a specific task you broke down with Fluye. What was it?
*(Free text — gives you real use cases)*

**Q3.** Were the steps Fluye generated actually useful?
- Yes, I followed most of them
- Somewhat — I had to adjust a few
- Not really — they were too generic
- They were confusing

**Q4.** Did you complete a task you might have otherwise procrastinated on?
- Yes, definitely
- Maybe — hard to say
- No

### Section 2: Experience (How did it feel?)

**Q5.** How did using Fluye make you feel? Pick all that apply.
- [ ] Relieved — finally had a starting point
- [ ] Motivated — small steps felt doable
- [ ] Frustrated — something didn't work right
- [ ] Overwhelmed — too many steps / too much info
- [ ] Indifferent — didn't change much
- [ ] Other: ___

**Q6.** Was there any moment where you felt stuck or confused?
*(Free text)*

**Q7.** How would you rate the overall experience?
- 1 (painful) to 5 (loved it)

### Section 3: Retention (Would you come back?)

**Q8.** Would you keep using Fluye after this test?
- Yes, I'd use it regularly
- Maybe, if [specific thing] improved
- Probably not

**Q9.** Would you recommend Fluye to a friend with ADHD?
- Definitely
- Maybe
- No

**Q10.** If you could change ONE thing about Fluye, what would it be?
*(Free text — the most valuable question)*

### Section 4: Optional

**Q11.** Anything else you want to share? Bugs, ideas, feelings?
*(Free text)*

**Q12.** Would you be open to a 10-minute call to share more feedback?
- Yes (leave email/number)
- No thanks

---

## Phase 5: Analyze & Prioritize (Day 7+)

After collecting responses:

1. **Sort feedback into buckets:**
   - Bugs (fix immediately)
   - UX friction (prioritize by frequency)
   - Feature requests (validate against multiple users)
   - Emotional feedback (inform design direction)

2. **Key decisions to make based on data:**
   - Are the AI breakdowns good enough? (If Q3 is mostly "too generic" → improve prompts)
   - Is the onboarding clear? (If activation < 70% → add guidance)
   - Is there retention signal? (If Q8 is mostly "yes" → you have product-market fit signal)
   - Is sharing working? (If 0 shares → rethink share button placement/incentive)

3. **Feed results into Sprint 3 planning** at `agents/claude/tasks/todo.md`

---

## Success Criteria

| Metric | Target | 🔴 Red Flag |
|--------|--------|------------|
| Activation (created 1+ task) | 70%+ | < 50% |
| Tasks per user (week) | 3+ average | < 1.5 |
| Step completion rate | 50%+ | < 30% |
| "Would keep using" (Q8) | 60%+ yes | < 40% |
| "Would recommend" (Q9) | 50%+ definitely | < 30% |
| NPS-style rating (Q7) | 4.0+ avg | < 3.0 |
