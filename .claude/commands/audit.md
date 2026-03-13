Run a focused audit of the codebase. Check for:

1. **Build health** — Run `npm run build` and report any errors or warnings.
2. **Security** — Scan API routes for missing auth checks, exposed secrets, or injection risks.
3. **Dead code** — Find unused imports, unreachable code, or orphaned files.
4. **AI layer** — Check `src/lib/gemini.ts` and breakdown/clarify/regenerate routes for error handling gaps.
5. **i18n gaps** — Find any hardcoded user-facing strings not going through `src/lib/i18n.ts`.

Output a concise report with severity levels (critical/warning/info) and suggested fixes.
