# Claude -- Task List (main branch)

## 1. Pre-Launch Design Polish (Priority: HIGH)
Make the app feel emotionally right before putting it in front of users.

- [x] **Focus Card layout** -- Glassmorphism container with backdrop-blur, glow on focus
- [x] **Rotating ghost text** -- 5 relatable placeholders cycle every 4s in textarea
- [x] **Breathing glow on CTA** -- Subtle pulse animation on "Get Clarity" button
- [x] **Active thinking loading messages** -- 5 rotating messages during AI processing
- [x] **Better space usage** -- Tighter vertical rhythm, max-w-2xl card, monospace textarea
- [x] **Progress ring for gamification** -- Replace static streak/trophy numbers in navbar with a small progress ring or level bar that fills up. Makes the dopamine loop visual.
- [x] **Line height / readability** -- Ensure body text has generous line-height (1.6-1.8) on dark background to avoid halation.

## 2. Pre-Launch Features (Priority: HIGH)
Minimum viable features before user testing.

- [x] **Auto-save drafts** -- localStorage persistence, restored on next visit via initialDraft prop
- [x] **Retry UX for API failures** -- "Try Again" button inline with error messages
- [x] **PWA manifest** -- manifest.json, SVG icons, apple-web-app meta, standalone display

## 3. Growth Features (Priority: MEDIUM)
From Phase 3 roadmap + Gemini's pending items.

- [x] **Task sharing link** (`/shared/[shareToken]`) -- Public read-only view of a broken-down task. No auth required to view. Share button on each task card generates the link + copies to clipboard. OG metadata for social previews.
- [x] **Analytics** -- Vercel Analytics added (page views + web vitals, zero-config)

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
**Sprint 2 (growth):** Items 1.6-1.7 + 3.1 (task sharing) ✅ COMPLETE
**Sprint 3 (iterate):** Based on user feedback from testing week
