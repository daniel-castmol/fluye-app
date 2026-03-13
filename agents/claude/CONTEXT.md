# Claude (Opus 4.6) -- Project Context

**Role:** Senior Staff Engineer & Codebase Auditor.
**Focus:** Code quality, architecture integrity, bug hunting, and pragmatic improvements.
**Branch:** `main` (merged gemini-dev, Sprint 1 complete).

## Tech Stack (Current)
- **Framework:** Next.js 16 (App Router, TypeScript strict mode).
- **Database:** Supabase (Postgres) + Prisma 7 (WASM).
- **AI:** Google Gemini (`gemini-flash-latest`) with native structured outputs.
- **Styling:** Tailwind CSS v4 + shadcn/ui.
- **Auth:** Supabase Auth (Google + GitHub OAuth, magic link).
- **Client Data:** SWR for completed/archived tabs, useState for active tasks.
- **i18n:** Custom EN/ES system (`src/lib/i18n.ts`).
- **Validation:** Zod for AI response validation.
- **Deployment:** Vercel.

## Session 1 (2026-03-07)
1. Deep codebase audit -- found 4 bugs, full report at `agents/claude/tasks/audit-report.md`
2. Bug fixes -- durationEstimate propagation, EmptyState language dep, streak UTC calc
3. Merged gemini-dev to main (fast-forward)
4. Gemini retry: 3 retries, exponential backoff, 429 handling
5. Sprint 1 design: Focus Card glassmorphism, rotating ghost text, breathing CTA, active thinking loading
6. Sprint 1 features: auto-save drafts, retry button, PWA manifest + icons, Vercel Analytics

## Session 2 (2026-03-08)
1. Progress ring component (`src/components/ui/progress-ring.tsx`) -- SVG ring with animated fill
2. Navbar integration -- streak ring fills over 7 days, trophy ring cycles every 10 tasks
3. Line height / readability -- `line-height: 1.7` + font smoothing on body
4. Task sharing feature:
   - Schema: `shareToken` (unique) + `isShared` on Task model
   - API: `POST /api/tasks/[taskId]/share` generates token (auth required)
   - Page: `/shared/[shareToken]` public read-only view with OG metadata
   - UI: Share button on task cards, copies link to clipboard with toast
   - 404: Custom not-found page for invalid/removed share links
   - i18n: EN/ES translations for all sharing strings
5. Sprint 2 complete -- all pre-launch items done

## Session 3 (2026-03-08, continued)
1. Account deletion feature — DELETE /api/profile, admin client, confirmation dialog in EditProfileModal
2. User testing plan — docs/user-testing-plan.md with 5-phase strategy, SQL queries, feedback form
3. Marketing docs — docs/marketing/ with recruitment messages (EN/ES) and feedback form questions
4. Email magic link login — primary sign-in option, Supabase OTP, "check your email" state
5. Spanish accent bug fix — Gemini structured output mangling accents, fixed via explicit prompt instructions
6. Backlog organized with user feedback: Notion integration, free-flow context, "go deeper" prompt, pomodoro, personal dev dashboard

## Session 4 (2026-03-12)
1. Sprint 3 planned — V2 architecture: from one-shot task tool to ADHD daily companion
2. Sub-Sprint 3A implemented (Foundation):
   - Project model + Task.projectId in Prisma schema
   - SQL migration applied: `sql/sprint3a-projects.sql`
   - Dashboard page with stats, project cards, recent activity
   - Collapsible sidebar with project list + mobile hamburger
   - App layout refactor: shared shell (Sidebar + Navbar + AppContext provider)
   - Project CRUD API routes (GET/POST /api/projects, GET/PATCH/DELETE /api/projects/[id])
   - Dashboard stats API (GET /api/dashboard)
   - Project detail view with scoped task breakdown
   - Legacy AppShell preserved at /app/tasks
   - i18n: all new strings in EN + ES
   - 23 files changed, 1775 lines added
3. Build passes with zero errors

## Current State
- Branch: `sprint3-dev` — Sprint 3A committed (`2441fe2`)
- `main` is production — Sprint 1 + Sprint 2 shipped, deployed on Vercel
- Sprint 3A needs to be pushed + merged to deploy
- **Next up:** Sub-Sprint 3B (Day Planner + Time Tracking)
- User testing in progress (~10 users)
- Gemini free tier rate-limited (20 RPD). User considering Claude API swap.
- **Known issue:** Can't test locally — OAuth redirects to Vercel domain
- Todo list: `agents/claude/tasks/todo.md`

## Collaboration
- AdaL context: `agents/adal/CONTEXT.md`
- Gemini context: `agents/gemini/CONTEXT.md`
- Workflow rules: `agents/README.md`
