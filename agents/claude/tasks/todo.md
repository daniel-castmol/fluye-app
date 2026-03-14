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

## 4. User Feedback (from testing week)

- [x] **Email magic link login** -- Users wanted to sign in without Google/GitHub
- [x] **Account deletion** -- Required for user trust, GDPR-friendly
- [x] **Spanish accent bug** -- Gemini structured output mangling accents (ó→3), fixed via explicit prompt instructions

## 5. Sprint 3: V2 — From Task Tool to ADHD Daily Companion

### Sub-Sprint 3A: Foundation (Projects + Dashboard + Navigation) ✅ COMPLETE
- [x] **Project model** -- CRUD, emoji + color, Task.projectId (nullable)
- [x] **Dashboard page** -- Stats row, project cards grid, recent activity
- [x] **Sidebar navigation** -- Collapsible, project list, mobile hamburger
- [x] **App layout refactor** -- Shared shell (Sidebar + Navbar + AppContext), proper routing
- [x] **Project detail view** -- Scoped task breakdown within projects
- [x] **Legacy flow preserved** -- AppShell at /app/tasks, existing tasks show as unassigned
- [x] **i18n** -- All new strings in EN + ES
- [x] **SQL migration** -- `sql/sprint3a-projects.sql` applied to Supabase

### Sub-Sprint 3B: Day Loop (Planner + Time Tracking + Step Editing) ✅ COMPLETE
- [x] **DayPlan model** -- id, profileId, date (unique per user+date), dailyWin, reflection, mood
- [x] **DayPlanStep model** -- join table linking steps to day plan, with order + time tracking
- [x] **TaskStep.userEditedText** -- Preserve user edits, keep original AI text
- [x] **Planner API** -- GET/PATCH /api/planner, POST/DELETE/PATCH /api/planner/steps, GET /api/planner/available
- [x] **DayPlanner component** -- Daily win input, ordered step list, timer controls
- [x] **PlannerStepCard** -- Checkbox, editable text, timer, reorder arrows
- [x] **StepPicker modal** -- Select steps to plan, flat list with project filter chips, yesterday rollover
- [x] **MiniTimer** -- Inline MM:SS with start/pause, auto-pause siblings
- [x] **EndOfDayView** -- Planned vs completed, reflection, mood selector, roll-over checkbox
- [x] **Sidebar updates** -- "Today's Plan" link with active timer indicator
- [x] **HintTooltip component** -- Contextual (?) help tooltips on time estimates, daily win, mood, planner
- [x] **Landing page "How it Works"** -- 3-step section + video placeholder + scroll CTA
- [x] **a11y fixes** -- SharedTaskView main landmark + aria-hidden fix

### Sub-Sprint 3C: Intelligence (Conversational Planning + Smart Estimates)
- [ ] **ConversationMessage model** -- projectId, role, content, metadata
- [ ] **StepFeedback model** -- reason for regeneration feedback
- [ ] **Project chat** -- Multi-turn Gemini conversation within projects
- [ ] **Regeneration feedback modal** -- "Too vague", "Too big", etc.
- [ ] **Smart estimates** -- Calibrate from actual time data, show accuracy badges

## 6. Deferred (Post-Launch / Data-Driven)
Don't build until validated by real user feedback.

- [ ] **Notion integration** -- Export/sync tasks to Notion. Multiple users requested.
- [ ] **Free-flow context input** -- Let users provide more context for complex tasks (could be paid tier)
- [ ] **"Go deeper" prompt generator** -- For tasks like cooking/research, generate a follow-up prompt with resources
- [ ] **Personal development dashboard** -- Analyze completed tasks to surface skills/abilities
- [ ] Stripe integration (wait for 10 active users who'd pay)
- [ ] Email recap / weekly summary
- [ ] Categorized chips (Work/Home/Personal)
- [ ] Brain dump / quick capture mode
- [ ] Soundscapes toggle (brown noise / lo-fi)
- [ ] Test suite (Vitest + integration tests)
- [ ] Extract hardcoded hex colors to Tailwind theme

## Execution Order

**Sprint 1 (ship to users):** Design polish + core features + analytics ✅ COMPLETE
**Sprint 2 (growth):** Progress rings + task sharing ✅ COMPLETE
**Sprint 3A (foundation):** Projects, dashboard, sidebar, routing refactor ✅ COMPLETE
**Sprint 3B (day loop):** Planner, time tracking, step editing, user guidance ✅ COMPLETE
**Sprint 3C (intelligence):** Conversational planning, smart estimates
