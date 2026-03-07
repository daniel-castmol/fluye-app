# Gemini CLI — Task List (gemini-dev branch)

## 0. Initial Cleanup & Setup ✅
- [x] Create `gemini-dev` branch
- [x] Set up `agents/` directory structure
- [x] Move existing context into `agents/`
- [x] Delete orphaned `src/components/app/TaskInput.tsx` (redundant with `EmptyState.tsx`)

## 1. Quick Wins & Tech Debt ✅
- [x] Implement SWR for tab data fetching (replaced module-level cache)
- [x] Refactor `/api/regenerate-step` to use Gemini JSON Schema output

## 2. AI Reliability (Native Structured Outputs) ✅
- [x] Update `/api/clarify` to use Gemini JSON Schema output
- [x] Update `/api/breakdown` to use Gemini JSON Schema output
- [x] Add `duration_estimate` to task step schema (AI-generated)

## 3. UX & Functional Features ✅
- [x] Display `duration_estimate` on task steps (UI)
- [x] Add Daily Streak and Global Progress metrics in Navbar

## 4. Growth & Monetization
- [ ] Build Task Sharing Link feature (`/shared/[taskId]`)
- [ ] Prepare Stripe Integration placeholders

## Review & Verification
- **Current Task:** Native Structured Outputs & Gamification
- **Status:** Complete
- **Next Step:** Task Sharing Link or Stripe Integration
