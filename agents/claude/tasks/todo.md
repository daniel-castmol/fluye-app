# Claude -- Task List (main branch)

## 1. Pre-Launch Design Polish (Priority: HIGH)
Make the app feel emotionally right before putting it in front of users.

- [ ] **Focus Card layout** -- Glassmorphism container for the input area (subtle backdrop-blur, border glow on focus). Tightens the visual hierarchy and makes the empty state feel like a conversation, not a form.
- [ ] **Rotating ghost text** -- Cycle relatable placeholder text inside the textarea ("I need to clean my apartment but I don't know where to start...", "Fix the bug in checkout but I keep procrastinating..."). Kills blank-form paralysis.
- [ ] **Breathing glow on CTA** -- Subtle pulse animation on "Get Clarity" button using mint `#86EFAC`. Acts as a visual lighthouse.
- [ ] **Active thinking loading messages** -- Replace static "Analyzing..." with rotating context-aware messages: "Understanding your context...", "Removing the noise...", "Finding your first 5-minute win...". Builds anticipation instead of frustration.
- [ ] **Better space usage** -- The app page (EmptyState) has too much dead space below chips. Tighten vertical rhythm, make the input card more prominent, reduce the gap between hero text and textarea.
- [ ] **Progress ring for gamification** -- Replace static streak/trophy numbers in navbar with a small progress ring or level bar that fills up. Makes the dopamine loop visual.
- [ ] **Line height / readability** -- Ensure body text has generous line-height (1.6-1.8) on dark background to avoid halation.

## 2. Pre-Launch Features (Priority: HIGH)
Minimum viable features before user testing.

- [ ] **Auto-save drafts** -- If user types something and navigates away (tab switch, page leave), persist it. Show toast on return: "We saved your thought. Ready to tackle it?" Small but critical for ADHD users who lose thoughts.
- [ ] **Retry UX for API failures** -- When Gemini 503s exhaust all retries, show a "Try again" button instead of just an error message. User shouldn't have to re-type.
- [ ] **PWA manifest + basic service worker** -- `manifest.json`, app icons, `display: standalone`. Users can "install" from mobile browser. No offline support needed yet, just the installability.

## 3. Growth Features (Priority: MEDIUM)
From Phase 3 roadmap + Gemini's pending items.

- [ ] **Task sharing link** (`/shared/[taskId]`) -- Public read-only view of a broken-down task. No auth required to view. Share button on each task card generates the link. Good for virality.
- [ ] **Analytics** -- PostHog or Vercel Analytics. Track: signups, breakdowns created, steps completed, retention. Need data before user testing week.

## 4. Deferred (Post-Launch / Data-Driven)
Don't build until validated by real user feedback.

- [ ] Stripe integration (wait for 10 active users who'd pay)
- [ ] Email recap / weekly summary
- [ ] Sidebar nav (validate if users want it)
- [ ] Categorized chips (Work/Home/Personal)
- [ ] Brain dump / quick capture mode
- [ ] Soundscapes toggle (brown noise / lo-fi)
- [ ] Step-by-step reveal animation (one step at a time)
- [ ] Test suite (Vitest + integration tests)
- [ ] Extract hardcoded hex colors to Tailwind theme

## Execution Order

**Sprint 1 (ship to users):** Items 1.1-1.5 (design) + 2.1-2.3 (features) + 3.2 (analytics)
**Sprint 2 (growth):** Items 1.6-1.7 + 3.1 (task sharing)
**Sprint 3 (iterate):** Based on user feedback from testing week
