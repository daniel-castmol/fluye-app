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

## Current State
- All branches aligned on `main`
- Sprint 1 complete. Sprint 2 next: task sharing, progress ring, readability
- Gemini free tier rate-limited (20 RPD). User considering Claude API swap.
- Todo list: `agents/claude/tasks/todo.md`

## Collaboration
- AdaL context: `agents/adal/CONTEXT.md`
- Gemini context: `agents/gemini/CONTEXT.md`
- Workflow rules: `agents/README.md`
