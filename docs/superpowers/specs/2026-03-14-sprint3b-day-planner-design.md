# Sprint 3B: Day Loop — Planner, Time Tracking, Step Editing

## Overview

Transform Fluye from a task breakdown tool into a daily companion by adding a Day Planner — where users pick steps to focus on today, track time per step, edit AI-generated text, and reflect at end of day.

**Core loop:** Open app → pick today's steps → work through them with timers → wrap up with reflection + mood.

## Data Models

### DayPlan

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| profileId | uuid | FK to UserProfile |
| date | date | Unique per user+date |
| dailyWin | text | Nullable. One thing user is proud of |
| reflection | text | Nullable. Free-text end-of-day note |
| mood | int | Nullable. 1-5 (maps to emojis in UI) |
| createdAt | datetime | |
| updatedAt | datetime | |

**Constraint:** Unique on `(profileId, date)`.

### DayPlanStep (join table)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| dayPlanId | uuid | FK to DayPlan |
| taskStepId | uuid | FK to TaskStep, onDelete: Cascade |
| sortOrder | int | Display order in planner |
| timeSpentSeconds | int | Default 0. Accumulated time |
| timerStartedAt | datetime | Nullable. Set when timer is running |
| createdAt | datetime | |
| updatedAt | datetime | |

### TaskStep changes

| Column | Type | Notes |
|--------|------|-------|
| userEditedText | text | Nullable. Overrides AI-generated `text` when set |

**Display rule:** Show `userEditedText ?? text` everywhere.

### Prisma relations

```prisma
model DayPlan {
  id         String   @id @default(uuid())
  profileId  String
  date       DateTime @db.Date
  dailyWin   String?
  reflection String?
  mood       Int?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  profile    UserProfile   @relation(fields: [profileId], references: [id], onDelete: Cascade)
  steps      DayPlanStep[]

  @@unique([profileId, date])
  @@index([profileId, date])
}

model DayPlanStep {
  id               String    @id @default(uuid())
  dayPlanId        String
  taskStepId       String
  sortOrder        Int
  timeSpentSeconds Int       @default(0)
  timerStartedAt   DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  dayPlan          DayPlan   @relation(fields: [dayPlanId], references: [id], onDelete: Cascade)
  taskStep         TaskStep  @relation(fields: [taskStepId], references: [id], onDelete: Cascade)

  @@index([dayPlanId, sortOrder])
}
```

Add to existing models:
- `UserProfile`: `dayPlans DayPlan[]`
- `TaskStep`: `dayPlanSteps DayPlanStep[]`, `userEditedText String?`

Also update `src/types/index.ts` — add `userEditedText?: string | null` to `TaskStep` interface.

### Timer logic

- `timerStartedAt` enables server-side timer without websockets
- On load: if `timerStartedAt` is set, elapsed = `now - timerStartedAt + timeSpentSeconds`
- On pause: server calculates final `timeSpentSeconds`, clears `timerStartedAt`
- On page reload: timer resumes automatically from `timerStartedAt`
- **Important:** `setInterval` in `useTimer` hook is for display refresh only. Actual elapsed time is always computed from `Date.now() - timerStartedAt + timeSpentSeconds`. Never accumulate time client-side.

## API Endpoints

### Auth pattern

All endpoints follow existing convention: `createClient()` → `supabase.auth.getUser()` → `prisma.userProfile.findUnique({ where: { userId } })` → use `profile.id` as `profileId` for all queries.

### Planner

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/planner?date=YYYY-MM-DD` | Get or upsert DayPlan for date, with steps joined to TaskStep + Task + Project data |
| PATCH | `/api/planner` | Update dailyWin, reflection, mood |

**Note:** GET with upsert is an intentional deviation from REST conventions. The DayPlan has no meaningful creation payload — it's just a date container. Auto-creating avoids a pointless "create plan" step in the UX.

**Date parameter:** Always provided by the client using the user's local date. If missing, defaults to today (UTC). If invalid format, return 400.

### Planner Steps

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/planner/steps` | Batch add steps (array of taskStepIds). Duplicates silently ignored. |
| DELETE | `/api/planner/steps/[id]` | Remove step from plan |
| PATCH | `/api/planner/steps/[id]` | Timer actions (start/pause) |
| PATCH | `/api/planner/steps/reorder` | Batch reorder (array of `{id, sortOrder}`) |

### Step Editing

| Method | Path | Purpose |
|--------|------|---------|
| PATCH | `/api/tasks/[taskId]/steps/[stepId]` | Extend existing route to accept `userEditedText` (null to reset) |

Uses the existing step route at `src/app/api/tasks/[taskId]/steps/[stepId]/route.ts` to stay consistent with the established nested resource pattern.

### Available Steps

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/planner/available?date=YYYY-MM-DD` | Incomplete steps NOT in today's plan, with project info + `fromYesterday` flag |

### Timer API details

- `PATCH /api/planner/steps/[id]` with `{ action: "start" }` → sets `timerStartedAt = now`
- `PATCH /api/planner/steps/[id]` with `{ action: "pause" }` → adds elapsed to `timeSpentSeconds`, clears `timerStartedAt`
- Starting a timer auto-pauses any other running timer in the same DayPlan
- **Auto-pause must use `prisma.$transaction`** to atomically: pause the running step (calculate elapsed, clear timerStartedAt) + start the new step
- Cannot start a timer on a completed step (return 400)

### Validation (Zod)

```typescript
// PATCH /api/planner
const PlannerUpdateSchema = z.object({
  dailyWin: z.string().max(500).nullable().optional(),
  reflection: z.string().max(2000).nullable().optional(),
  mood: z.number().int().min(1).max(5).nullable().optional(),
})

// POST /api/planner/steps
const AddStepsSchema = z.object({
  taskStepIds: z.array(z.string().uuid()).min(1).max(50),
})

// PATCH /api/planner/steps/[id]
const StepActionSchema = z.object({
  action: z.enum(["start", "pause"]),
})

// PATCH /api/planner/steps/reorder
const ReorderSchema = z.object({
  steps: z.array(z.object({ id: z.string().uuid(), sortOrder: z.number().int() })),
})
```

### Error responses

All errors return `{ error: "message" }` with appropriate status codes (400, 401, 404, 500), consistent with existing API routes.

## UI Components

### `/app/planner` page

Single page, two visual states:

**Active state (during the day):**
- Header: "Today's Plan" + date + "Add Steps" button
- Daily Win text input at top (fillable anytime)
- Ordered list of PlannerStepCard components
- Empty state: prompt to pick steps

### PlannerStepCard

- Project color dot + emoji (left)
- Checkbox (marks TaskStep completed via existing `PATCH /api/tasks/[taskId]/steps/[stepId]`)
- Step text — inline editable (click to edit, blur/enter to save)
- "Reset to original" link (visible only when userEditedText is set)
- MiniTimer on the right (MM:SS + play/pause)
- Up/down arrows for reorder (Slice 1). Drag-and-drop deferred.

### StepPicker modal

- Flat list of incomplete steps not in today's plan
- Project filter chips at top (with color dots)
- Each row: project color dot, task name (dimmed), step text, checkbox
- "Roll over from yesterday?" section at top (steps from yesterday's plan that weren't completed)
- "Add to plan" button with count badge

### MiniTimer

- Displays MM:SS (H:MM:SS if > 1hr)
- Play/pause toggle
- Starting auto-pauses any other running timer
- Visual pulse/green when active

### EndOfDayView

Accessed via "Wrap up" button in planner header (not a separate page):
- Planned vs completed stats (e.g., "5/7 steps done")
- Total time tracked
- Daily win (pre-filled if entered earlier)
- Mood selector: 5 emoji buttons (1=rough to 5=great)
- Optional reflection textarea
- "Roll over incomplete" checkbox
- "Save & close" button

### Sidebar updates

- "Today's Plan" link below Dashboard
- Active timer indicator (subtle dot or pulse)

## State Management

- **SWR** for DayPlan fetching (key: `/api/planner?date=YYYY-MM-DD`)
  - Use `revalidateOnFocus: false` to prevent timer display disruption on tab switch
- **Optimistic updates** for timer, completion, reorder
- **`useTimer` hook** — takes `timerStartedAt` + `timeSpentSeconds`, runs `setInterval` every second for display only. Elapsed is always computed from timestamps, not accumulated.
- **No global state store** — SWR cache handles everything (consistent with existing app patterns)

### Rollover flow

- GET `/api/planner/available` includes `fromYesterday` flag on steps that were in yesterday's plan but incomplete
- StepPicker groups these at top with "Roll over from yesterday?" prompt

## Behaviors & Edge Cases

### Step completion from planner
- Checking a step in PlannerStepCard calls existing `PATCH /api/tasks/[taskId]/steps/[stepId]` with `completed: true`
- This preserves existing task auto-completion logic (task completes when all steps done)
- If a timer is running on the step being completed, auto-pause first (finalize timeSpentSeconds)

### Deleted/regenerated steps
- `DayPlanStep.taskStepId` has `onDelete: Cascade` — if a TaskStep is deleted (via task deletion or step regeneration), the DayPlanStep is automatically removed
- UI handles this gracefully via SWR refetch

### Timezone handling
- `date` parameter is always provided by the client using the user's local date (`new Date().toLocaleDateString('en-CA')` → YYYY-MM-DD)
- Server stores and queries the date as-is, no timezone conversion
- This matches user expectations: "today" means their today, not UTC today

### Duplicate step adds
- POST `/api/planner/steps` silently skips taskStepIds that are already in today's plan
- Returns the successfully added steps only

## User Guidance & Onboarding

Driven by user feedback: "too confusing and overwhelming" + "didn't understand the time estimates."

### Landing page: "How it Works" section

The "See How It Works" CTA button exists in `LandingPage.tsx` but links to nothing. Build the section it should scroll to:

- **3-step visual explanation**: "1. Type what's overwhelming you → 2. AI breaks it into small steps → 3. Check them off one by one"
- **Demo video embed**: Placeholder container for a user-recorded video walkthrough. Uses standard `<video>` or YouTube embed. The user will record and provide the video file/URL separately.
- **"See How It Works" button** scrolls down to this section (smooth scroll via `#how-it-works` anchor)
- Keep it concise — this is marketing, not documentation

### In-app contextual hints

Always-visible `(?)` icons with tooltip on hover/tap. No dismiss state, no tracking — just static helper text. Key placements:

| Location | Hint text (EN) | Hint text (ES) |
|----------|---------------|----------------|
| Time estimate badge on steps | "AI-estimated time based on step complexity" | "Tiempo estimado por IA basado en la complejidad del paso" |
| Task input textarea | "Describe what you need to do — be as vague or specific as you want" | "Describe lo que necesitas hacer — tan vago o específico como quieras" |
| Planner empty state | "Pick steps from your tasks to focus on today" | "Elige pasos de tus tareas para enfocarte hoy" |
| MiniTimer | "Track how long each step actually takes" | "Registra cuánto tiempo toma cada paso" |
| Daily Win input | "One thing you're proud of today, no matter how small" | "Algo de lo que estés orgulloso hoy, por pequeño que sea" |
| Mood selector | "Quick check-in — how did today feel?" | "Check rápido — ¿cómo se sintió el día?" |

### Implementation

- Create a reusable `HintTooltip` component (wraps shadcn `Tooltip`) — takes `hintKey` string, renders `(?)` icon + tooltip from i18n
- All hint strings go through `src/lib/i18n.ts` as `hints.*` keys
- Tooltip appears on hover (desktop) and tap (mobile)

## i18n

All new user-facing strings in both EN and ES via `src/lib/i18n.ts`. Includes planner strings, hint tooltips, and landing page "How it Works" content.

## Implementation Slices

### Slice 1: Core Planner (models + API + basic page)
- SQL migration: DayPlan, DayPlanStep tables + TaskStep.userEditedText
- Prisma schema + generate
- TypeScript types update
- All API endpoints (planner, steps, available, extend existing step route)
- DayPlanner page with PlannerStepCard (checkbox, text, project color — no timer yet)
- StepPicker modal (flat list, filters, rollover)
- Sidebar: "Today's Plan" link
- `HintTooltip` component + contextual hints on existing features (time estimate badge, task input)
- Landing page "How it Works" section + wire up "See How It Works" button scroll
- i18n strings (planner + hints + landing page)

### Slice 2: Timer & Step Editing
- MiniTimer component
- `useTimer` hook
- Timer API actions (start/pause, auto-pause siblings with $transaction)
- Timer + completion interaction (auto-pause on complete)
- Inline step editing + "reset to original"
- Active timer indicator in sidebar

### Slice 3: End of Day
- EndOfDayView component
- PATCH `/api/planner` for dailyWin, reflection, mood
- "Wrap up" button in planner header
- Rollover checkbox functionality

Each slice is independently shippable and testable on the preview branch.
