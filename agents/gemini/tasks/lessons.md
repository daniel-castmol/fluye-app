# Lessons Learned — Fluye

## Database & Infrastructure
- **Prisma 7 WASM + WSL2 Migration Issues:** `npx prisma migrate dev` is unreliable in this environment. 
- **Migration Strategy:** Use manual SQL migrations via Supabase SQL Editor, then run `npx prisma generate` to update types.
- **Prisma Configuration:** Keep `prisma.config.ts` simple. Avoid `directUrl` if manual migrations are preferred.
- **Environment Variables:** `DATABASE_URL` is sufficient for runtime and type generation.

## Development Patterns
- **SWR for Client-Side Caching:** Replaces fragile module-level variables in React components.
- **Gemini Native Structured Output:** Far more reliable than regex-parsing JSON from strings. Requires explicit `Schema` types from `@google/generative-ai` to satisfy TypeScript.
- **ADHD-Aware UX:** Time estimation (`duration_estimate`) and gamification (streaks) are core value props.
