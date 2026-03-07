# Lessons Learned — Fluye

## Database & Infrastructure
- **Supabase Connection Pooler (6543):** Can be unstable in WSL2 for Prisma migrations.
- **Direct Connection (5432):** Preferred for CLI migrations.
- **Prisma Configuration:** `datasource` should always define both `url` (for runtime/pooler) and `directUrl` (for migrations/CLI).
- **Environment Variables:** `DATABASE_URL` for pooler, `DIRECT_URL` for direct connection.

## Development Patterns
- **SWR for Client-Side Caching:** Replaces fragile module-level variables in React components.
- **Gemini Native Structured Output:** Far more reliable than regex-parsing JSON from strings. Requires `responseSchema` and `as const` or explicit `Schema` types to satisfy TypeScript.
- **ADHD-Aware UX:** Time estimation (`duration_estimate`) and gamification (streaks) are core value props, not just "nice to haves".
