# Codebase Audit Report -- gemini-dev branch
**Date:** 2026-03-06
**Auditor:** Claude (Opus 4.6)

## Executive Summary

**Verdict: Keep gemini-dev, fix bugs, then merge to main.**

Gemini's 3 commits are net positive. The structured outputs migration, duration estimates, and progression tracking are solid features that move the product forward. However, there are real bugs that need fixing before merge.

Going back to `dev` would lose:
- Native structured outputs (more reliable than regex parsing)
- Duration estimates on steps (core ADHD UX value)
- Streak/progression tracking (gamification)
- SWR migration for tab data

None of these are broken enough to justify reverting. Fix forward.

---

## Bugs Found (Must Fix)

### BUG 1: Step regeneration doesn't update durationEstimate in UI
**File:** `src/components/app/AppShell.tsx:251`
**Severity:** Medium

The `handleStepRegenerate` callback only updates `step.text` but ignores `step.durationEstimate` from the API response. After regenerating, the old duration badge stays (or disappears if there wasn't one).

```typescript
// Current (broken):
steps: task.steps.map((s) =>
  s.id === stepId ? { ...s, text: step.text } : s
)

// Should be:
steps: task.steps.map((s) =>
  s.id === stepId ? { ...s, text: step.text, durationEstimate: step.durationEstimate } : s
)
```

### BUG 2: Unused `diffInDays` variable
**File:** `src/app/api/tasks/[taskId]/steps/[stepId]/route.ts:72`
**Severity:** Low (dead code, not a runtime issue)

`diffInDays` is computed but never used. The streak logic uses `isToday`/`isYesterday` string comparisons instead. Remove it.

### BUG 3: EmptyState useEffect missing `language` dependency
**File:** `src/components/app/EmptyState.tsx:83`
**Severity:** Medium

The effect depends on `language` (used for cache validation and API call) but the dependency array only has `[profileId]`. Changing language won't re-fetch chips in the correct language until next page load.

```typescript
// Current:
}, [profileId]);

// Should be:
}, [profileId, language]);
```

### BUG 4: Streak calculation uses local Date but compares UTC strings
**File:** `src/app/api/tasks/[taskId]/steps/[stepId]/route.ts:69-82`
**Severity:** Low

`new Date()` creates a local-time date, but `toISOString().split("T")[0]` converts to UTC. A user completing a task at 11pm EST could get the wrong day comparison. This is minor because Vercel servers run in UTC anyway, but worth noting.

---

## Code Quality Issues

### ISSUE 1: useCallback dependency warnings (ESLint)
**Files:** `AppShell.tsx:91-92, 135, 216`

Several useCallbacks have `eslint-disable` comments or missing deps (`language`, `t.taskList.taskCrushed`). These are mostly harmless due to closure behavior but should be cleaned up.

### ISSUE 2: Hardcoded colors everywhere
**Pattern:** `text-[#F8FAFC]`, `bg-[#0F172A]`, `border-[#334155]` across all components.

The design system colors (Deep Navy, Soft Mint, Off-White, Slate Grey) are used as raw hex values everywhere instead of Tailwind theme variables. This makes global design changes painful.

### ISSUE 3: No error boundary
React errors in any component crash the entire app. Should add an error boundary at the AppShell level.

### ISSUE 4: No test coverage
Zero tests. Not a single test file in the repo. Critical paths (AI response parsing, step toggle, rate limiting) have no regression protection.

### ISSUE 5: Clarification JSON shape not typed
`task.clarification` is stored as a JSON string and parsed with `JSON.parse(task.clarification || "{}")` in multiple places without a shared type. Should have a `ClarificationData` interface.

---

## What's Working Well

1. **Structured outputs migration** -- Far more reliable than regex JSON extraction. Good call by Gemini.
2. **Zod validation layer** -- All AI responses go through Zod before use. Solid defensive pattern.
3. **Security model** -- Every API route verifies auth + ownership. Two-level checks for step operations.
4. **SWR for lazy tabs** -- Completed/archived tabs use SWR with dedup intervals. Clean pattern.
5. **i18n coverage** -- 262 translation keys across EN/ES. Thorough.
6. **Optimistic updates** -- Step toggles update UI immediately with rollback on failure.
7. **Rate limiting** -- DB-backed, survives serverless cold starts. Free/pro tiers.
8. **Duration estimates** -- Good ADHD UX addition. Time visibility reduces anxiety.

---

## Architecture Assessment

| Area | Grade | Notes |
|------|-------|-------|
| Security | A- | Auth + ownership verified everywhere. No IP-level rate limiting. |
| Type Safety | B+ | Strict TS, Zod for AI. No input validation schemas. |
| State Management | B | Centralized in AppShell. Some prop drilling, but manageable at this scale. |
| Error Handling | C+ | Inconsistent. Some routes use fallbacks, others return 500. No error boundary. |
| Testing | F | Zero tests. |
| Code Organization | B+ | Clean file structure, good separation of concerns. |
| Performance | B+ | Builds fast, lazy-loaded tabs, SWR caching. No pagination risk. |
| Database | A- | Clean schema, proper indexes, cascading deletes. |
| AI Integration | A | Structured outputs + Zod + retry + fallbacks. |

---

## Recommended Action Plan

### Phase 1: Bug Fixes (before merge)
1. Fix step regeneration durationEstimate propagation
2. Fix EmptyState language dependency
3. Remove unused diffInDays
4. Clean up useCallback dependencies

### Phase 2: Merge & Stabilize
5. Merge gemini-dev to main
6. Add React error boundary
7. Type the clarification JSON

### Phase 3: Quality (next sprint)
8. Add Vitest + basic test suite
9. Extract hardcoded colors to Tailwind theme
10. Add request body validation with Zod
