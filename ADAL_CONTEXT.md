# Fluye Webapp — AdaL Session Context
**Last updated:** 2026-03-02  
**Branch:** `main`  
**Owner:** personal project — ADHD-focused AI task breakdown app

---

## TL;DR
Fluye is a Next.js 16 App Router web app that helps users with ADHD break vague to-dos into concrete, achievable steps using Gemini AI. Users set up a profile (name, role, projects, language), paste tasks, answer AI clarification questions, and get step-by-step breakdowns they can check off.

---

## Tech Stack
| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Database | Supabase (Postgres) |
| ORM | Prisma 7 (WebAssembly, `src/generated/prisma`) |
| AI | Google Gemini (`gemini-flash-latest`) |
| Validation | Zod |
| Auth | Supabase Auth (email magic link) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Deployment | Vercel |
| Node req. | Node 22 (Prisma 7 WASM requires it) |

---

## Project Structure
```
src/
  app/
    api/
      clarify/route.ts         # AI clarification questions (rate-limited)
      breakdown/route.ts       # AI task breakdown (rate-limited)
      regenerate-step/route.ts # AI step rewrite for single step
      tasks/route.ts           # GET ?status=active|archived, DELETE (archive all)
      tasks/[taskId]/route.ts  # DELETE (archive), PATCH (restore)
      tasks/[taskId]/steps/[stepId]/route.ts  # PATCH step completed toggle
      profile/route.ts         # GET/PUT user profile
    profile-setup/page.tsx     # Onboarding page
    page.tsx                   # Main app page (server component, loads tasks)
  components/
    app/
      AppShell.tsx             # Main client orchestrator (all state lives here)
      AppNavbar.tsx            # Top nav with sign-out
      EmptyState.tsx           # First-run hero with example task chips
      TaskInput.tsx            # Compact input (used when tasks already exist)
      ClarificationChat.tsx    # Q&A clarification UI
      TaskList.tsx             # Active tasks with step checkboxes, regenerate, progress
      ArchivedTaskList.tsx     # Archived tasks with restore button (lazy-loaded)
    ui/                        # shadcn/ui primitives
  lib/
    i18n.ts                    # EN/ES translation dictionaries + getTranslations()
    prisma.ts                  # Prisma client singleton
    schemas.ts                 # Zod schemas (ClarifyResponseSchema, BreakdownResponseSchema)
    supabase/                  # client.ts + server.ts + middleware.ts
    utils.ts                   # cn(), isNewDay()
  types/index.ts               # UserProfile, Task, TaskStep, etc.
  generated/prisma/            # Generated Prisma client (do not edit)
prisma/
  schema.prisma                # Source of truth for DB schema
  supabase_migration_v2.sql    # Manual migration applied in Supabase Dashboard
```

---

## Database Schema (Prisma)
```prisma
UserProfile  — id, userId (Supabase auth UID), email, name, roleWork?, projects?,
               preferredLanguage (en|es), subscriptionStatus (free|pro),
               taskBreakdownsToday, lastBreakdownReset,
               clarifyRequestsToday, lastClarifyReset

Task         — id, profileId (→ UserProfile.id), originalText, clarification (JSON),
               status (active|archived), createdAt, completedAt?

TaskStep     — id, taskId, text, order, completed, completedAt?
```

**Key architectural note:** `Task.profileId` references `UserProfile.id` (not Supabase's `auth.users.id`). Always resolve via profile lookup.

---

## State & Data Flow
```
AppShell (client)
  ├── step: "input" | "clarifying" | "loading" | "tasks"
  ├── activeTab: "active" | "archived"
  ├── tasks: Task[]  (active tasks in memory)
  └── handlers: handleTaskSubmit → handleBreakdown → handleStepToggle
                handleStepRegenerate → handleTaskDelete → handleClearAll
                handleTaskRestored (from archive)

EmptyState shown when step=input && tasks.length=0
TaskInput  shown when step=input && tasks.length>0
ArchivedTaskList fetches /api/tasks?status=archived lazily on tab open
```

---

## Rate Limiting (DB-backed)
- **Clarify:** 20 requests/day (free), resets UTC midnight
- **Breakdown:** 10 breakdowns/day (free), resets UTC midnight
- Pro tier: effectively unlimited (999999/day)
- Counter fields live on `UserProfile`, reset via `isNewDay()` check

---

## i18n System
- Supported languages: `en`, `es`
- Source: `src/lib/i18n.ts` — `translations` object with full EN/ES dictionaries
- Usage: `AppShell` calls `getTranslations(profile.preferredLanguage)` → passes `t` prop to all components
- To add new string: add key to both `en` and `es` objects in `i18n.ts`, then type `t.section.key` in components

---

## What Was Built (V2 — Sessions 1-3)

### Week 1 — Security & Foundation ✅
- Renamed `Task.userId` → `Task.profileId` (now correctly references UserProfile.id)
- Added `preferredLanguage`, rate-limit DB fields to UserProfile
- Implemented `isNewDay()` utility + DB-backed rate limiting on clarify + breakdown routes
- Added Zod validation for all AI responses (`schemas.ts`)
- Created `prisma/supabase_migration_v2.sql` for manual apply (done in Supabase Dashboard)

### Week 2 — Usability ✅
- **Task 5:** i18n system (EN/ES) — all UI strings translated
- **Task 6:** Step Regenerate — per-step ↻ button, `/api/regenerate-step`, AI rewrites one step with full task context
- **Task 8:** EmptyState — hero screen for first-time users with example task chips
- **Task 9:** Archive/Tabs — Active/Archived tab bar, lazy-loaded `ArchivedTaskList`, restore endpoint

---

## What's Next (Session 4 — Phase 2 Improvements)

### Immediate fixes (from user feedback — do first):
1. **Language switcher in navbar** — decouple language from profile; in-app `EN|ES` toggle that syncs to profile in background; detect browser language on landing page
2. **EmptyState as universal input** — always show hero+chips when adding a task, not just first run (remove `TaskInput` or relegate it)
3. **Edit Profile** — navbar option to update name, role, projects, language without going through full onboarding again
4. **Completed Tasks tab** — when last step of a task is checked, auto-transition to `status: "completed"`; add 3rd tab (Active | Completed | Archived); add "Reopen" button; **requires DB migration**
5. **Context-aware example chips** — generate 4 chips via AI on first load, cache per profile in localStorage; refresh when profile changes (nice-to-have, do after tab work)

### Technical debt (mitigate immediately in session 4):
- Extract `"gemini-flash-latest"` to a shared constant (duplicated in 3 routes)
- Extract shared `TaskForm` from `TaskInput`/`EmptyState` (near-identical code)
- Add `toast.error(t.errors.restoreFailed)` to `ArchivedTaskList` restore error handler
- `ArchivedTaskList` re-fetches on every tab open — add simple timestamp-based cache invalidation

### Also in session 4:
- Set up test users workflow (owner is out of test email addresses — need guidance on email aliases, temp mail services, or Supabase test user seeding)

### Future (Week 3+ proper):
- Task sharing — public read-only link
- Pro upgrade flow — Stripe integration
- PWA / mobile — manifest.json, service worker
- Email recap — weekly summary via Supabase Edge Functions
- Analytics — PostHog event tracking

---

## Known Issues / Tech Debt
- `npx tsc --noEmit` works but produces libtinfo warning in this WSL2 environment (harmless)
- `ArchivedTaskList` re-fetches every time the Archived tab is opened — no cache invalidation needed yet but worth noting
- `TaskInput` and `EmptyState` share near-identical form code — could be extracted to a shared `TaskForm` component
- No toast on restore failure (only logs to console) — should add `toast.error(t.errors.restoreFailed)`
- Gemini model name `"gemini-flash-latest"` is duplicated across 3 route files — extract to a shared constant

---

## Environment Variables (required)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY   # server-side only
GEMINI_API_KEY
DATABASE_URL                # Supabase direct connection (port 5432) — NOT pooler
```

**Prisma + Supabase note:** Use direct connection URL (port 5432), not the pooler (port 6543). Prisma migrations hang on the pooler. Vercel uses the pooler for runtime queries — both URLs may be needed.

---

## AdaL Workflow Notes
- All schema changes must be applied manually in Supabase Dashboard (SQL Editor) using `prisma/supabase_migration_v2.sql` — `prisma migrate dev` hangs on pooler
- After adding Prisma schema fields, regenerate client: `npx prisma generate`
- Type check: `npx tsc --noEmit` (ignore libtinfo warning)
- Deploy: `git push origin main` → Vercel auto-deploys
