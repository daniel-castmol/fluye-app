# Claude (Opus 4.6) -- Project Context

**Role:** Senior Staff Engineer & Codebase Auditor.
**Focus:** Code quality, architecture integrity, bug hunting, and pragmatic improvements.
**Branch:** `gemini-dev` (auditing Gemini's changes before merge decision).

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

## Branch Topology
- `main` = `dev` = commit `1c5311f` (AdaL's Phase 2 complete)
- `gemini-dev` = `main` + 3 commits (Gemini's Phase 3 work)

## What Gemini Changed (3 commits on gemini-dev)
1. **Agent context structure** -- created `agents/` directory, moved ADAL_CONTEXT
2. **Native Structured Outputs** -- migrated all 3 AI routes from regex JSON parsing to Gemini's `responseSchema`
3. **Duration estimates** -- added `durationEstimate` field to TaskStep (schema + UI)
4. **Progression tracking** -- streak + total tasks completed in UserProfile + navbar display
5. **SWR migration** -- replaced module-level cache in completed/archived lists
6. **Deleted TaskInput.tsx** -- consolidated into EmptyState

## Collaboration
- AdaL context: `agents/adal/CONTEXT.md`
- Gemini context: `agents/gemini/CONTEXT.md`
- Workflow rules: `agents/README.md`
