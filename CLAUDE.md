# Fluye — ADHD Task Breakdown Companion

## What is Fluye?
An AI-powered app that helps people with ADHD break overwhelming tasks into manageable steps. Users type what they need to do, AI breaks it down, and they check off steps one by one. Built for dopamine loops, not productivity theater.

## Tech Stack
- **Framework:** Next.js 16 (App Router, TypeScript strict)
- **Database:** Supabase (Postgres) + Prisma 7 (WASM adapter)
- **AI:** Google Gemini (`gemini-flash-latest`) — abstracted in `src/lib/gemini.ts`. Anthropic SDK also installed.
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Auth:** Supabase Auth (Google OAuth, GitHub OAuth, email magic link)
- **Client State:** SWR for completed/archived, useState for active tasks
- **i18n:** Custom EN/ES system in `src/lib/i18n.ts`
- **Validation:** Zod for AI response schemas
- **Deployment:** Vercel. Repo: `daniel-castmol/fluye-app`

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build (use to verify before pushing)
- `npm run lint` — ESLint
- `npx prisma generate` — Regenerate Prisma client after schema changes
- **No test suite yet** — biggest tech debt

## Project Structure
```
src/
  app/                  # Next.js App Router pages + API routes
    api/
      breakdown/        # Main AI task breakdown endpoint
      clarify/          # AI follow-up questions
      regenerate-step/  # Regenerate individual steps
      tasks/            # CRUD + share + step completion
      profile/          # User profile + account deletion
      example-chips/    # Suggested task examples
    app/                # Main authenticated app page
    login/              # Login page
    auth/callback/      # OAuth callback
    profile-setup/      # Onboarding
    shared/[shareToken] # Public shared task view
  components/
    ui/                 # shadcn/ui + custom (progress-ring, etc.)
    app/                # App-specific components
  lib/
    gemini.ts           # AI abstraction layer (swap point for Claude API)
    i18n.ts             # Translations (EN/ES)
    supabase/           # Supabase clients (browser, server, admin)
  types/                # Shared TypeScript types
  generated/prisma/     # Generated Prisma client (gitignored)
agents/                 # AI agent context & task tracking
  claude/               # Claude session context + tasks
  gemini/               # Gemini CLI context + lessons
  adal/                 # Previous AI assistant context
docs/                   # Marketing, testing plans
```

## Database / Migrations
- **DO NOT use `prisma migrate dev`** — it hangs on Supabase connection pooler in WSL2.
- Write SQL manually, apply via Supabase Dashboard SQL Editor, then run `npx prisma generate`.
- Schema file: `prisma/schema.prisma`

## Coding Conventions
- Functional components with hooks. No class components.
- Server components by default; `"use client"` only when needed.
- API routes return `NextResponse.json()` with appropriate status codes.
- Auth: always verify session via `createClient()` from `src/lib/supabase/server.ts` in API routes.
- AI responses validated with Zod schemas before use.
- Translations: all user-facing strings go through `i18n.ts`, support both EN and ES.
- shadcn/ui components live in `src/components/ui/`.

## Working Style
- **Ship > Perfect.** Get it working, then iterate.
- **Plan first for non-trivial tasks** (3+ steps or architectural decisions).
- **Simplicity first.** Minimal code, minimal impact. Don't over-engineer.
- **Verify before done.** Run build, check the actual behavior.
- **Autonomous bug fixing.** Don't ask for hand-holding — investigate, find root cause, fix it.
- **Ask before destructive actions.** Always consult before deleting, force-pushing, or major refactors.

## Git Workflow
- `main` = production (deployed on Vercel)
- `sprint3-dev` = current feature branch
- Commit messages: conventional commits style (`feat:`, `fix:`, `chore:`, `docs:`)
- PRs go to `main`

## Agent Context
Historical session context lives in `agents/claude/CONTEXT.md` and `agents/claude/tasks/todo.md`. Check these for prior decisions and backlog items.
