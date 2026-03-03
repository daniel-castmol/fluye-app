# Fluye — AdaL Project Instructions

## What This Project Is
ADHD-focused AI task breakdown web app. Users paste vague to-dos → AI clarifies → breaks into concrete steps. Personal project, actively iterated.

## Stack (critical to know)
- **Next.js 16** App Router, TypeScript strict mode
- **Supabase** (Postgres + Auth via magic link)
- **Prisma 7** WebAssembly client — output at `src/generated/prisma/` — **Node 22 required**
- **Gemini AI** (`gemini-flash-latest`) — shared constant TODO (currently duplicated in 3 routes)
- **Zod** for AI response validation (`src/lib/schemas.ts`)
- **Tailwind v4** + shadcn/ui — dark theme, palette: `#0F172A` bg, `#86EFAC` green, `#F8FAFC` text, `#94A3B8` muted
- **Vercel** deployment — push to `main` → auto-deploy

## Architecture Rules
1. **`Task.profileId` → `UserProfile.id`** (NOT Supabase auth UID). Always resolve: `supabase.auth.getUser()` → `prisma.userProfile.findUnique({ where: { userId: user.id } })` → use `profile.id`
2. **DB migrations**: `prisma migrate dev` hangs on Supabase pooler. All schema changes go in `prisma/supabase_migration_v2.sql` for manual apply in Supabase Dashboard SQL Editor. Direct connection (port 5432) for migrations, pooler (port 6543) for runtime.
3. **i18n**: All UI strings must be added to BOTH `en` and `es` in `src/lib/i18n.ts`. Components receive `t: Translations` prop from `AppShell`. Never hardcode strings.
4. **State**: All app state lives in `AppShell.tsx`. Child components receive handlers as props. No global state library.
5. **Auth check pattern**: Every API route must call `supabase.auth.getUser()` first, then resolve profile.

## Key Files
```
src/lib/i18n.ts              # EN/ES translations — add keys to BOTH languages
src/lib/schemas.ts           # Zod AI response schemas
prisma/schema.prisma         # DB schema source of truth
prisma/supabase_migration_v2.sql  # Manual migration (apply in Supabase Dashboard)
src/components/app/AppShell.tsx   # Main orchestrator — all state here
src/types/index.ts           # TypeScript types (Task, TaskStep, UserProfile)
ADAL_CONTEXT.md              # Full roadmap, progress log, architectural decisions
```

## Current Status (as of 2026-03-02)
- Week 1 ✅ Security: profileId rename, rate limiting, Zod validation
- Week 2 ✅ Usability: i18n, step regenerate, EmptyState, archive/tabs
- **Next session**: Phase 2 improvements (see ADAL_CONTEXT.md for full list)

## Immediate Priorities for Next Session
1. Language switcher in navbar (decouple from profile)
2. EmptyState as universal add-task UI (replace TaskInput)
3. Edit Profile (navbar option)
4. Completed Tasks tab (status: "completed" — needs DB migration)
5. Test users setup guidance (owner needs help with email strategy)
6. Tech debt: extract Gemini constant, extract TaskForm, add restore error toast

## Commands
```bash
npx tsc --noEmit          # Type check (ignore libtinfo warning — harmless in WSL2)
npx prisma generate       # Regenerate Prisma client after schema changes
git push origin main      # Deploy to Vercel
```

## Dev Style
- Surgical edits only — never reformat unrelated code
- Always add i18n keys in BOTH languages
- Preserve all existing comments
- No hardcoded colors outside the established palette
- Run `npx tsc --noEmit` before committing
