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

## Current State
- Branch: `new-dev-env` (Sprint 2 work, merging to `main`)
- Sprint 1 + Sprint 2 complete. All pre-launch features done.
- **Manual SQL migration required** before sharing works:
  ```sql
  ALTER TABLE "Task" ADD COLUMN "shareToken" TEXT UNIQUE;
  ALTER TABLE "Task" ADD COLUMN "isShared" BOOLEAN NOT NULL DEFAULT false;
  ```
- Gemini free tier rate-limited (20 RPD). User considering Claude API swap.
- Todo list: `agents/claude/tasks/todo.md`

## Collaboration
- AdaL context: `agents/adal/CONTEXT.md`
- Gemini context: `agents/gemini/CONTEXT.md`
- Workflow rules: `agents/README.md`
