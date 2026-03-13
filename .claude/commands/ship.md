Pre-ship checklist before merging to main:

1. Run `npm run build` — must pass with zero errors
2. Run `npm run lint` — must pass
3. Check for any `console.log` statements that should be removed
4. Verify no hardcoded secrets or API keys in committed files
5. Check that all new API routes have proper auth guards
6. Verify i18n — any new user-facing strings have EN/ES translations
7. Review git diff against main — summarize what's shipping
8. Flag any SQL migrations that need to be run manually on Supabase

Report pass/fail for each item. If all pass, draft the PR description.
