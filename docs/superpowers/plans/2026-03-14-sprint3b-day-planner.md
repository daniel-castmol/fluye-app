# Sprint 3B: Day Loop Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Day Planner to Fluye so ADHD users can pick daily steps, track time, edit AI text, and reflect at end of day. Also add user guidance (landing page "How it Works" + contextual tooltips).

**Architecture:** Three incremental slices — each independently shippable. Slice 1: data models + API + basic planner page + guidance. Slice 2: timers + step editing. Slice 3: end-of-day reflection. All state via SWR (no global store). Timer uses server-side `timerStartedAt` timestamp pattern.

**Tech Stack:** Next.js 16 (App Router), Prisma 7, Supabase Postgres, Tailwind v4 + shadcn/ui, SWR, Zod, Lucide icons

**Spec:** `docs/superpowers/specs/2026-03-14-sprint3b-day-planner-design.md`

---

## Chunk 1: Data Layer + Core API

### Task 1: SQL Migration

**Files:**
- Create: `sql/sprint3b-day-planner.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Sprint 3B: Day Planner tables + TaskStep.userEditedText

-- DayPlan: one per user per date
CREATE TABLE IF NOT EXISTS "DayPlan" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "profileId" UUID NOT NULL REFERENCES "UserProfile"("id") ON DELETE CASCADE,
  "date" DATE NOT NULL,
  "dailyWin" TEXT,
  "reflection" TEXT,
  "mood" INTEGER,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "DayPlan_profileId_date_key" UNIQUE ("profileId", "date")
);

CREATE INDEX "DayPlan_profileId_date_idx" ON "DayPlan"("profileId", "date");

-- DayPlanStep: join table linking steps to a day plan
CREATE TABLE IF NOT EXISTS "DayPlanStep" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "dayPlanId" UUID NOT NULL REFERENCES "DayPlan"("id") ON DELETE CASCADE,
  "taskStepId" UUID NOT NULL REFERENCES "TaskStep"("id") ON DELETE CASCADE,
  "sortOrder" INTEGER NOT NULL,
  "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0,
  "timerStartedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "DayPlanStep_dayPlanId_sortOrder_idx" ON "DayPlanStep"("dayPlanId", "sortOrder");

-- Add userEditedText to TaskStep
ALTER TABLE "TaskStep" ADD COLUMN IF NOT EXISTS "userEditedText" TEXT;
```

- [ ] **Step 2: Apply migration via Supabase Dashboard SQL Editor**

Copy the SQL from `sql/sprint3b-day-planner.sql` and run it in the Supabase Dashboard SQL Editor. Do NOT use `prisma migrate dev` (it hangs on Supabase pooler in WSL2).

- [ ] **Step 3: Commit**

```bash
git add sql/sprint3b-day-planner.sql
git commit -m "feat(3B): add SQL migration for DayPlan, DayPlanStep, and TaskStep.userEditedText"
```

---

### Task 2: Prisma Schema + Types

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add DayPlan model to Prisma schema**

Add after the `TaskStep` model (after line 110 in `prisma/schema.prisma`):

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

  profile    UserProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)
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

- [ ] **Step 2: Add relations to existing models**

In the `UserProfile` model (line 44, after `ownedProjects Project[]`), add:
```prisma
  dayPlans     DayPlan[]
```

In the `TaskStep` model (before the `@@index` on line 109), add:
```prisma
  userEditedText String?
  dayPlanSteps   DayPlanStep[]
```

- [ ] **Step 3: Run Prisma generate**

```bash
npx prisma generate
```

Expected: "Generated Prisma Client" success message.

- [ ] **Step 4: Update TypeScript types**

In `src/types/index.ts`, add `userEditedText` to `TaskStep` interface (after line 26, before the closing `}`):

```typescript
  userEditedText: string | null;
```

Add new interfaces at the end of the file (after `BreakdownResponse`):

```typescript
export interface DayPlan {
  id: string;
  profileId: string;
  date: string;
  dailyWin: string | null;
  reflection: string | null;
  mood: number | null;
  createdAt: string;
  updatedAt: string;
  steps: DayPlanStepWithDetails[];
}

export interface DayPlanStep {
  id: string;
  dayPlanId: string;
  taskStepId: string;
  sortOrder: number;
  timeSpentSeconds: number;
  timerStartedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DayPlanStepWithDetails extends DayPlanStep {
  taskStep: TaskStep & {
    task: Pick<Task, "id" | "originalText" | "projectId"> & {
      project: Pick<Project, "id" | "name" | "emoji" | "color"> | null;
    };
  };
}

export interface AvailableStep {
  id: string;
  text: string;
  userEditedText: string | null;
  order: number;
  durationEstimate: string | null;
  completed: boolean;
  taskId: string;
  taskName: string;
  projectId: string | null;
  project: Pick<Project, "id" | "name" | "emoji" | "color"> | null;
  fromYesterday: boolean;
}
```

- [ ] **Step 5: Verify build compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: No type errors related to new types.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma src/types/index.ts
git commit -m "feat(3B): add Prisma models DayPlan/DayPlanStep and TypeScript types"
```

---

### Task 3: Planner API — GET/PATCH `/api/planner`

**Files:**
- Create: `src/app/api/planner/route.ts`

- [ ] **Step 1: Create the planner route**

```typescript
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const PlannerUpdateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dailyWin: z.string().max(500).nullable().optional(),
  reflection: z.string().max(2000).nullable().optional(),
  mood: z.number().int().min(1).max(5).nullable().optional(),
});

async function getProfile(userId: string) {
  return prisma.userProfile.findUnique({ where: { userId } });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getProfile(user.id);
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 400 });

  const dateParam = request.nextUrl.searchParams.get("date");
  const date = dateParam ? new Date(dateParam + "T00:00:00.000Z") : new Date(new Date().toISOString().split("T")[0] + "T00:00:00.000Z");

  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }

  // Upsert: get or create DayPlan for this date
  const dayPlan = await prisma.dayPlan.upsert({
    where: {
      profileId_date: { profileId: profile.id, date },
    },
    create: { profileId: profile.id, date },
    update: {},
    include: {
      steps: {
        orderBy: { sortOrder: "asc" },
        include: {
          taskStep: {
            include: {
              task: {
                select: {
                  id: true,
                  originalText: true,
                  projectId: true,
                  project: { select: { id: true, name: true, emoji: true, color: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  return NextResponse.json(dayPlan);
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getProfile(user.id);
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 400 });

  const body = await request.json();
  const parsed = PlannerUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const dateParam = parsed.data.date;
  const date = dateParam ? new Date(dateParam + "T00:00:00.000Z") : new Date(new Date().toISOString().split("T")[0] + "T00:00:00.000Z");

  const dayPlan = await prisma.dayPlan.findUnique({
    where: { profileId_date: { profileId: profile.id, date } },
  });

  if (!dayPlan) {
    return NextResponse.json({ error: "Day plan not found" }, { status: 404 });
  }

  const updated = await prisma.dayPlan.update({
    where: { id: dayPlan.id },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}
```

- [ ] **Step 2: Verify route compiles**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/planner/route.ts
git commit -m "feat(3B): add GET/PATCH /api/planner with upsert and Zod validation"
```

---

### Task 4: Planner Steps API — POST, DELETE, PATCH, Reorder

**Files:**
- Create: `src/app/api/planner/steps/route.ts`
- Create: `src/app/api/planner/steps/[id]/route.ts`
- Create: `src/app/api/planner/steps/reorder/route.ts`

- [ ] **Step 1: Create batch add endpoint**

`src/app/api/planner/steps/route.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const AddStepsSchema = z.object({
  taskStepIds: z.array(z.string().uuid()).min(1).max(50),
  date: z.string().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 400 });

  const body = await request.json();
  const parsed = AddStepsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const dateStr = parsed.data.date || new Date().toISOString().split("T")[0];
  const date = new Date(dateStr + "T00:00:00.000Z");

  // Verify all steps belong to user
  const steps = await prisma.taskStep.findMany({
    where: {
      id: { in: parsed.data.taskStepIds },
      task: { profileId: profile.id },
    },
  });

  if (steps.length === 0) {
    return NextResponse.json({ error: "No valid steps found" }, { status: 400 });
  }

  // Upsert DayPlan
  const dayPlan = await prisma.dayPlan.upsert({
    where: { profileId_date: { profileId: profile.id, date } },
    create: { profileId: profile.id, date },
    update: {},
  });

  // Get existing steps to avoid duplicates and determine next sortOrder
  const existing = await prisma.dayPlanStep.findMany({
    where: { dayPlanId: dayPlan.id },
    select: { taskStepId: true, sortOrder: true },
  });

  const existingStepIds = new Set(existing.map((e) => e.taskStepId));
  const maxOrder = existing.reduce((max, e) => Math.max(max, e.sortOrder), 0);

  const newSteps = steps
    .filter((s) => !existingStepIds.has(s.id))
    .map((s, i) => ({
      dayPlanId: dayPlan.id,
      taskStepId: s.id,
      sortOrder: maxOrder + i + 1,
    }));

  if (newSteps.length > 0) {
    await prisma.dayPlanStep.createMany({ data: newSteps });
  }

  return NextResponse.json({ added: newSteps.length }, { status: 201 });
}
```

- [ ] **Step 2: Create single step DELETE/PATCH endpoint**

`src/app/api/planner/steps/[id]/route.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const StepActionSchema = z.object({
  action: z.enum(["start", "pause"]),
});

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 400 });

  const { id } = await params;

  const dayPlanStep = await prisma.dayPlanStep.findUnique({
    where: { id },
    include: { dayPlan: true },
  });

  if (!dayPlanStep || dayPlanStep.dayPlan.profileId !== profile.id) {
    return NextResponse.json({ error: "Step not found" }, { status: 404 });
  }

  await prisma.dayPlanStep.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 400 });

  const { id } = await params;
  const body = await request.json();
  const parsed = StepActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const dayPlanStep = await prisma.dayPlanStep.findUnique({
    where: { id },
    include: { dayPlan: true, taskStep: true },
  });

  if (!dayPlanStep || dayPlanStep.dayPlan.profileId !== profile.id) {
    return NextResponse.json({ error: "Step not found" }, { status: 404 });
  }

  if (parsed.data.action === "start") {
    // Cannot start timer on completed step
    if (dayPlanStep.taskStep.completed) {
      return NextResponse.json({ error: "Cannot start timer on completed step" }, { status: 400 });
    }

    // Atomic: pause any running timer + start this one
    const result = await prisma.$transaction(async (tx) => {
      // Find and pause any running timer in this day plan
      const runningStep = await tx.dayPlanStep.findFirst({
        where: {
          dayPlanId: dayPlanStep.dayPlanId,
          timerStartedAt: { not: null },
          id: { not: id },
        },
      });

      if (runningStep && runningStep.timerStartedAt) {
        const elapsed = Math.floor((Date.now() - runningStep.timerStartedAt.getTime()) / 1000);
        await tx.dayPlanStep.update({
          where: { id: runningStep.id },
          data: {
            timeSpentSeconds: runningStep.timeSpentSeconds + elapsed,
            timerStartedAt: null,
          },
        });
      }

      // Start this timer
      return tx.dayPlanStep.update({
        where: { id },
        data: { timerStartedAt: new Date() },
      });
    });

    return NextResponse.json(result);
  }

  if (parsed.data.action === "pause") {
    if (!dayPlanStep.timerStartedAt) {
      return NextResponse.json({ error: "Timer not running" }, { status: 400 });
    }

    const elapsed = Math.floor((Date.now() - dayPlanStep.timerStartedAt.getTime()) / 1000);
    const updated = await prisma.dayPlanStep.update({
      where: { id },
      data: {
        timeSpentSeconds: dayPlanStep.timeSpentSeconds + elapsed,
        timerStartedAt: null,
      },
    });

    return NextResponse.json(updated);
  }
}
```

- [ ] **Step 3: Create reorder endpoint**

`src/app/api/planner/steps/reorder/route.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const ReorderSchema = z.object({
  steps: z.array(z.object({
    id: z.string().uuid(),
    sortOrder: z.number().int().min(0),
  })),
});

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 400 });

  const body = await request.json();
  const parsed = ReorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Verify all steps belong to this user's day plan
  const stepIds = parsed.data.steps.map((s) => s.id);
  const ownedSteps = await prisma.dayPlanStep.findMany({
    where: { id: { in: stepIds }, dayPlan: { profileId: profile.id } },
    select: { id: true },
  });

  if (ownedSteps.length !== stepIds.length) {
    return NextResponse.json({ error: "Step not found" }, { status: 404 });
  }

  await prisma.$transaction(
    parsed.data.steps.map((s) =>
      prisma.dayPlanStep.update({
        where: { id: s.id },
        data: { sortOrder: s.sortOrder },
      })
    )
  );

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Verify routes compile**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/planner/steps/
git commit -m "feat(3B): add planner steps API — batch add, delete, timer start/pause, reorder"
```

---

### Task 5: Available Steps API + Extend Step Edit

**Files:**
- Create: `src/app/api/planner/available/route.ts`
- Modify: `src/app/api/tasks/[taskId]/steps/[stepId]/route.ts`

- [ ] **Step 1: Create available steps endpoint**

`src/app/api/planner/available/route.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.userProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 400 });

  const dateParam = request.nextUrl.searchParams.get("date");
  const todayStr = dateParam || new Date().toISOString().split("T")[0];
  const today = new Date(todayStr + "T00:00:00.000Z");

  // Get today's plan step IDs to exclude
  const todayPlan = await prisma.dayPlan.findUnique({
    where: { profileId_date: { profileId: profile.id, date: today } },
    include: { steps: { select: { taskStepId: true } } },
  });

  const excludeIds = todayPlan?.steps.map((s) => s.taskStepId) || [];

  // Get yesterday's plan for rollover detection
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  const yesterdayPlan = await prisma.dayPlan.findUnique({
    where: { profileId_date: { profileId: profile.id, date: yesterday } },
    include: { steps: { select: { taskStepId: true } } },
  });

  const yesterdayStepIds = new Set(yesterdayPlan?.steps.map((s) => s.taskStepId) || []);

  // Get all incomplete steps for this user
  const steps = await prisma.taskStep.findMany({
    where: {
      completed: false,
      id: excludeIds.length > 0 ? { notIn: excludeIds } : undefined,
      task: { profileId: profile.id, status: "active" },
    },
    include: {
      task: {
        select: {
          id: true,
          originalText: true,
          projectId: true,
          project: { select: { id: true, name: true, emoji: true, color: true } },
        },
      },
    },
    orderBy: { order: "asc" },
  });

  const available = steps.map((s) => ({
    id: s.id,
    text: s.text,
    userEditedText: s.userEditedText,
    order: s.order,
    durationEstimate: s.durationEstimate,
    completed: s.completed,
    taskId: s.task.id,
    taskName: s.task.originalText,
    projectId: s.task.projectId,
    project: s.task.project,
    fromYesterday: yesterdayStepIds.has(s.id),
  }));

  return NextResponse.json(available);
}
```

- [ ] **Step 2: Extend existing step PATCH to support userEditedText**

In `src/app/api/tasks/[taskId]/steps/[stepId]/route.ts`, modify the PATCH handler. After line 19 (`const { completed } = body;`), change the validation and update logic:

Replace lines 19-24:
```typescript
  const { completed } = body;

  if (typeof completed !== "boolean") {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
```

With:
```typescript
  const { completed, userEditedText } = body;

  // Must provide at least one valid field
  const hasCompleted = typeof completed === "boolean";
  const hasEditedText = "userEditedText" in body;

  if (!hasCompleted && !hasEditedText) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
```

Then, **after** the existing profile + task ownership checks (after the `if (!task)` block at line 39), add the `userEditedText` handler:

```typescript
  // Handle userEditedText update (independent of completion)
  if (hasEditedText && !hasCompleted) {
    const step = await prisma.taskStep.update({
      where: { id: stepId },
      data: { userEditedText: userEditedText ?? null },
    });
    return NextResponse.json({ step });
  }
```

This ensures the user owns the task before allowing step text edits. The rest of the existing completion logic remains unchanged.

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/planner/available/route.ts src/app/api/tasks/[taskId]/steps/[stepId]/route.ts
git commit -m "feat(3B): add available steps API and extend step PATCH for userEditedText"
```

---

## Chunk 2: UI Components — Planner Page

### Task 6: i18n Strings

**Files:**
- Modify: `src/lib/i18n.ts`

- [ ] **Step 1: Add planner, hints, and landing "How it Works" strings to EN**

In `src/lib/i18n.ts`, after the `landing` section (after line 178), add these new sections inside the `en` object:

```typescript
    planner: {
      title: "Today's Plan",
      addSteps: "Add Steps",
      dailyWinPlaceholder: "What's your win today?",
      emptyTitle: "No steps planned yet",
      emptySubtitle: "Pick some steps from your tasks to focus on today",
      addFirst: "Add your first steps",
      wrapUp: "Wrap up",
      planned: "planned",
      completed: "completed",
      timeTracked: "Time tracked",
      resetToOriginal: "Reset to original",
      rolloverTitle: "From yesterday",
      rolloverSubtitle: "These steps weren't completed — roll them over?",
      selectAll: "Select all",
      addToPlan: "Add to plan",
      filterAll: "All",
      noAvailable: "All steps are already in today's plan!",
      moveUp: "Move up",
      moveDown: "Move down",
      removeFromPlan: "Remove from plan",
    },
    endOfDay: {
      title: "Wrap Up Your Day",
      stepsCompleted: "steps completed",
      totalTime: "Total time tracked",
      dailyWinLabel: "Daily Win",
      dailyWinPlaceholder: "One thing you're proud of today, no matter how small",
      moodLabel: "How did today feel?",
      reflectionLabel: "Reflection",
      reflectionPlaceholder: "Anything you want to remember about today? (optional)",
      rolloverLabel: "Roll over incomplete steps to tomorrow",
      saveClose: "Save & Close",
    },
    hints: {
      timeEstimate: "AI-estimated time based on step complexity",
      taskInput: "Describe what you need to do — be as vague or specific as you want",
      plannerEmpty: "Pick steps from your tasks to focus on today",
      miniTimer: "Track how long each step actually takes",
      dailyWin: "One thing you're proud of today, no matter how small",
      moodSelector: "Quick check-in — how did today feel?",
    },
    howItWorks: {
      title: "How It Works",
      step1Title: "Dump Your Task",
      step1Desc: "Type what's overwhelming you. Be as vague as you want — \"fix the project\" works.",
      step2Title: "AI Breaks It Down",
      step2Desc: "We ask a few smart questions, then split it into concrete 5-minute steps.",
      step3Title: "Check Them Off",
      step3Desc: "Work through steps one by one. Each checkmark is a little dopamine hit.",
      videoPlaceholder: "Demo video coming soon",
    },
```

- [ ] **Step 2: Add matching ES translations**

After the `landing` section in the `es` object (after line 349), add:

```typescript
    planner: {
      title: "Plan de Hoy",
      addSteps: "Agregar Pasos",
      dailyWinPlaceholder: "¿Cuál es tu logro de hoy?",
      emptyTitle: "Aún no hay pasos planeados",
      emptySubtitle: "Elige pasos de tus tareas para enfocarte hoy",
      addFirst: "Agrega tus primeros pasos",
      wrapUp: "Cerrar el día",
      planned: "planeados",
      completed: "completados",
      timeTracked: "Tiempo registrado",
      resetToOriginal: "Restaurar original",
      rolloverTitle: "De ayer",
      rolloverSubtitle: "Estos pasos no se completaron — ¿los pasamos a hoy?",
      selectAll: "Seleccionar todos",
      addToPlan: "Agregar al plan",
      filterAll: "Todos",
      noAvailable: "¡Todos los pasos ya están en el plan de hoy!",
      moveUp: "Subir",
      moveDown: "Bajar",
      removeFromPlan: "Quitar del plan",
    },
    endOfDay: {
      title: "Cierra Tu Día",
      stepsCompleted: "pasos completados",
      totalTime: "Tiempo total registrado",
      dailyWinLabel: "Logro del Día",
      dailyWinPlaceholder: "Algo de lo que estés orgulloso hoy, por pequeño que sea",
      moodLabel: "¿Cómo se sintió el día?",
      reflectionLabel: "Reflexión",
      reflectionPlaceholder: "¿Algo que quieras recordar sobre hoy? (opcional)",
      rolloverLabel: "Pasar pasos incompletos a mañana",
      saveClose: "Guardar y Cerrar",
    },
    hints: {
      timeEstimate: "Tiempo estimado por IA basado en la complejidad del paso",
      taskInput: "Describe lo que necesitas hacer — tan vago o específico como quieras",
      plannerEmpty: "Elige pasos de tus tareas para enfocarte hoy",
      miniTimer: "Registra cuánto tiempo toma cada paso",
      dailyWin: "Algo de lo que estés orgulloso hoy, por pequeño que sea",
      moodSelector: "Check rápido — ¿cómo se sintió el día?",
    },
    howItWorks: {
      title: "Cómo Funciona",
      step1Title: "Escribe Tu Tarea",
      step1Desc: "Escribe lo que te agobia. Sé tan vago como quieras — \"arreglar el proyecto\" funciona.",
      step2Title: "La IA Lo Descompone",
      step2Desc: "Hacemos preguntas inteligentes, luego lo dividimos en pasos concretos de 5 minutos.",
      step3Title: "Márcalos Como Hechos",
      step3Desc: "Avanza paso a paso. Cada check es un pequeño golpe de dopamina.",
      videoPlaceholder: "Video demo próximamente",
    },
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n.ts
git commit -m "feat(3B): add i18n strings for planner, end-of-day, hints, and how-it-works (EN/ES)"
```

---

### Task 7: HintTooltip Component

**Files:**
- Create: `src/components/ui/hint-tooltip.tsx`

- [ ] **Step 1: Create the HintTooltip component**

This wraps shadcn's Tooltip with a `(?)` icon. Check which shadcn tooltip components are available first:

```bash
ls src/components/ui/tooltip*
```

If no tooltip exists, install it:
```bash
npx shadcn@latest add tooltip
```

Then create `src/components/ui/hint-tooltip.tsx`:

```typescript
"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface HintTooltipProps {
  text: string;
  className?: string;
}

export function HintTooltip({ text, className }: HintTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center justify-center p-0.5 rounded-full text-[#64748B] hover:text-[#94A3B8] transition-colors ${className || ""}`}
            aria-label="Help"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[220px] bg-[#1E293B] border-[#334155] text-[#F8FAFC] text-xs"
        >
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/hint-tooltip.tsx
git commit -m "feat(3B): add HintTooltip component for contextual help"
```

---

### Task 8: Landing Page "How it Works" Section

**Files:**
- Modify: `src/components/app/LandingPage.tsx`

- [ ] **Step 1: Wire up the "See How It Works" button to scroll**

In `src/components/app/LandingPage.tsx`, replace the button at lines 97-102:

```typescript
            <button
              type="button"
              className="px-8 py-4 rounded-full border border-[#334155] text-[#F8FAFC] font-semibold text-lg hover:bg-[#334155]/50 transition-all duration-300 backdrop-blur-sm"
            >
              {t.landing.ctaSecondary}
            </button>
```

With:

```typescript
            <button
              type="button"
              onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
              className="px-8 py-4 rounded-full border border-[#334155] text-[#F8FAFC] font-semibold text-lg hover:bg-[#334155]/50 transition-all duration-300 backdrop-blur-sm"
            >
              {t.landing.ctaSecondary}
            </button>
```

- [ ] **Step 2: Add the "How it Works" section**

After the closing `</section>` tag (line 137), before the closing `</main>` tag (line 138), add:

```tsx
      {/* How it Works */}
      <section id="how-it-works" className="relative py-20 px-4 border-t border-[#334155]/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-[#F8FAFC] mb-16">
            {t.howItWorks.title}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {[
              { num: "1", title: t.howItWorks.step1Title, desc: t.howItWorks.step1Desc },
              { num: "2", title: t.howItWorks.step2Title, desc: t.howItWorks.step2Desc },
              { num: "3", title: t.howItWorks.step3Title, desc: t.howItWorks.step3Desc },
            ].map((step) => (
              <div key={step.num} className="flex flex-col items-center md:items-start text-center md:text-left">
                <div className="h-10 w-10 rounded-full bg-[#86EFAC]/10 border border-[#86EFAC]/20 flex items-center justify-center text-[#86EFAC] font-bold text-sm mb-4">
                  {step.num}
                </div>
                <h3 className="text-[#F8FAFC] font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-[#F8FAFC]/60 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Video placeholder */}
          <div className="max-w-3xl mx-auto rounded-xl border border-[#334155] bg-[#1E293B]/30 aspect-video flex items-center justify-center">
            <p className="text-[#64748B] text-sm">{t.howItWorks.videoPlaceholder}</p>
          </div>
        </div>
      </section>
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/components/app/LandingPage.tsx
git commit -m "feat(3B): add How it Works section to landing page with scroll CTA"
```

---

### Task 9: Sidebar — Add "Today's Plan" Link

**Files:**
- Modify: `src/components/app/Sidebar.tsx`

- [ ] **Step 1: Add CalendarCheck icon import**

In `src/components/app/Sidebar.tsx`, add `CalendarCheck` to the lucide-react import (line 8):

```typescript
import {
  LayoutDashboard,
  Zap,
  CalendarCheck,
  Plus,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
```

- [ ] **Step 2: Add planner nav item**

In the `navItems` array (after line 45, the Quick Task entry), add:

```typescript
    {
      href: "/app/planner",
      label: t.sidebar.planner,
      icon: CalendarCheck,
      active: pathname === "/app/planner",
    },
```

- [ ] **Step 3: Add i18n key for sidebar planner**

In `src/lib/i18n.ts`, add to the EN `sidebar` section (after line 127 `unassigned`):
```typescript
      planner: "Today's Plan",
```

Add to the ES `sidebar` section (after line 298 `unassigned`):
```typescript
      planner: "Plan de Hoy",
```

- [ ] **Step 4: Verify build**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add src/components/app/Sidebar.tsx src/lib/i18n.ts
git commit -m "feat(3B): add Today's Plan link to sidebar navigation"
```

---

### Task 10: StepPicker Modal

**Files:**
- Create: `src/components/app/StepPicker.tsx`

- [ ] **Step 1: Create the StepPicker component**

```typescript
"use client";

import { useState, useEffect, useMemo } from "react";
import type { Translations } from "@/lib/i18n";
import type { AvailableStep } from "@/types";
import { X, Check } from "lucide-react";

interface StepPickerProps {
  t: Translations;
  open: boolean;
  date: string;
  onClose: () => void;
  onAdd: (stepIds: string[]) => void;
}

export default function StepPicker({ t, open, date, onClose, onAdd }: StepPickerProps) {
  const [steps, setSteps] = useState<AvailableStep[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelected(new Set());
    setFilter(null);
    fetch(`/api/planner/available?date=${date}`)
      .then((r) => r.json())
      .then((data) => setSteps(data))
      .catch(() => setSteps([]))
      .finally(() => setLoading(false));
  }, [open, date]);

  const projects = useMemo(() => {
    const map = new Map<string, { id: string; name: string; emoji: string; color: string }>();
    steps.forEach((s) => {
      if (s.project && !map.has(s.project.id)) {
        map.set(s.project.id, s.project);
      }
    });
    return Array.from(map.values());
  }, [steps]);

  const filtered = useMemo(() => {
    if (!filter) return steps;
    return steps.filter((s) => s.project?.id === filter);
  }, [steps, filter]);

  const yesterdaySteps = useMemo(() => filtered.filter((s) => s.fromYesterday), [filtered]);
  const otherSteps = useMemo(() => filtered.filter((s) => !s.fromYesterday), [filtered]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllYesterday() {
    setSelected((prev) => {
      const next = new Set(prev);
      yesterdaySteps.forEach((s) => next.add(s.id));
      return next;
    });
  }

  function handleAdd() {
    onAdd(Array.from(selected));
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg max-h-[80vh] bg-[#1E293B] border border-[#334155] rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#334155]">
          <h2 className="text-[#F8FAFC] font-bold text-lg">{t.planner.addSteps}</h2>
          <button type="button" onClick={onClose} className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter chips */}
        {projects.length > 0 && (
          <div className="flex gap-2 px-5 py-3 border-b border-[#334155]/50 overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilter(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-colors ${
                !filter ? "bg-[#86EFAC]/20 text-[#86EFAC]" : "bg-[#334155]/50 text-[#94A3B8] hover:text-[#F8FAFC]"
              }`}
            >
              {t.planner.filterAll}
            </button>
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setFilter(p.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-colors ${
                  filter === p.id ? "bg-[#86EFAC]/20 text-[#86EFAC]" : "bg-[#334155]/50 text-[#94A3B8] hover:text-[#F8FAFC]"
                }`}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                {p.emoji} {p.name}
              </button>
            ))}
          </div>
        )}

        {/* Step list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1">
          {loading && <p className="text-[#64748B] text-sm text-center py-8">Loading...</p>}

          {!loading && steps.length === 0 && (
            <p className="text-[#64748B] text-sm text-center py-8">{t.planner.noAvailable}</p>
          )}

          {/* Yesterday rollover */}
          {yesterdaySteps.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#86EFAC]">{t.planner.rolloverTitle}</span>
                <button type="button" onClick={selectAllYesterday} className="text-xs text-[#86EFAC] hover:underline">
                  {t.planner.selectAll}
                </button>
              </div>
              <p className="text-xs text-[#94A3B8] mb-2">{t.planner.rolloverSubtitle}</p>
              {yesterdaySteps.map((step) => (
                <StepRow key={step.id} step={step} selected={selected.has(step.id)} onToggle={toggle} />
              ))}
            </div>
          )}

          {/* Other steps */}
          {otherSteps.map((step) => (
            <StepRow key={step.id} step={step} selected={selected.has(step.id)} onToggle={toggle} />
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#334155]">
          <button
            type="button"
            onClick={handleAdd}
            disabled={selected.size === 0}
            className="w-full py-2.5 rounded-lg bg-[#86EFAC] text-[#0F172A] font-semibold text-sm hover:bg-emerald-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t.planner.addToPlan} {selected.size > 0 && `(${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}

function StepRow({
  step,
  selected,
  onToggle,
}: {
  step: AvailableStep;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(step.id)}
      className={`flex items-start gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors ${
        selected ? "bg-[#86EFAC]/10" : "hover:bg-[#334155]/30"
      }`}
    >
      <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
        selected ? "bg-[#86EFAC] border-[#86EFAC]" : "border-[#64748B]"
      }`}>
        {selected && <Check className="w-3 h-3 text-[#0F172A]" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          {step.project && (
            <>
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: step.project.color }} />
              <span className="text-[10px] text-[#64748B] truncate">{step.project.emoji} {step.project.name}</span>
            </>
          )}
          <span className="text-[10px] text-[#475569] truncate">• {step.taskName}</span>
        </div>
        <span className="text-sm text-[#F8FAFC]">{step.userEditedText || step.text}</span>
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/app/StepPicker.tsx
git commit -m "feat(3B): add StepPicker modal with project filters and yesterday rollover"
```

---

### Task 11: PlannerStepCard Component

**Files:**
- Create: `src/components/app/PlannerStepCard.tsx`

- [ ] **Step 1: Create the PlannerStepCard component (Slice 1 — no timer yet)**

```typescript
"use client";

import type { Translations } from "@/lib/i18n";
import type { DayPlanStepWithDetails } from "@/types";
import { Circle, CheckCircle2, ChevronUp, ChevronDown, X, Clock } from "lucide-react";

interface PlannerStepCardProps {
  t: Translations;
  step: DayPlanStepWithDetails;
  isFirst: boolean;
  isLast: boolean;
  onComplete: (taskId: string, stepId: string, completed: boolean) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onRemove: (id: string) => void;
}

export default function PlannerStepCard({
  t,
  step,
  isFirst,
  isLast,
  onComplete,
  onMoveUp,
  onMoveDown,
  onRemove,
}: PlannerStepCardProps) {
  const ts = step.taskStep;
  const displayText = ts.userEditedText || ts.text;
  const project = ts.task.project;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
      ts.completed ? "bg-[#86EFAC]/5 opacity-60" : "bg-[#1E293B]/50 hover:bg-[#1E293B]/80"
    }`}>
      {/* Project indicator */}
      <div className="flex flex-col items-center gap-1 pt-0.5">
        {project && (
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
        )}
      </div>

      {/* Checkbox */}
      <button
        type="button"
        onClick={() => onComplete(ts.task.id, ts.id, !ts.completed)}
        className="mt-0.5 shrink-0"
      >
        {ts.completed ? (
          <CheckCircle2 className="w-5 h-5 text-[#86EFAC]" />
        ) : (
          <Circle className="w-5 h-5 text-[#475569] hover:text-[#86EFAC] transition-colors" />
        )}
      </button>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <span className={`text-sm leading-relaxed ${
          ts.completed ? "text-[#94A3B8] line-through" : "text-[#F8FAFC]"
        }`}>
          {displayText}
        </span>
        {ts.durationEstimate && !ts.completed && (
          <span className="inline-flex items-center w-fit gap-1 ml-2 px-1.5 py-0.5 rounded-md bg-[#334155]/40 text-[#86EFAC] text-[10px] font-medium border border-[#86EFAC]/10">
            <Clock className="w-2.5 h-2.5" />
            {ts.durationEstimate}
          </span>
        )}
        {project && (
          <div className="mt-1 text-[10px] text-[#64748B]">
            {project.emoji} {project.name}
          </div>
        )}
      </div>

      {/* Actions */}
      {!ts.completed && (
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onMoveUp(step.id)}
            disabled={isFirst}
            className="p-1 text-[#64748B] hover:text-[#F8FAFC] transition-colors disabled:opacity-30"
            title={t.planner.moveUp}
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(step.id)}
            disabled={isLast}
            className="p-1 text-[#64748B] hover:text-[#F8FAFC] transition-colors disabled:opacity-30"
            title={t.planner.moveDown}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(step.id)}
            className="p-1 text-[#64748B] hover:text-red-400 transition-colors"
            title={t.planner.removeFromPlan}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/app/PlannerStepCard.tsx
git commit -m "feat(3B): add PlannerStepCard component with completion, reorder, and remove"
```

---

### Task 12: DayPlanner Page

**Files:**
- Create: `src/components/app/DayPlanner.tsx`
- Create: `src/app/app/planner/page.tsx`

- [ ] **Step 1: Create the DayPlanner component**

```typescript
"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import type { Translations } from "@/lib/i18n";
import type { DayPlan } from "@/types";
import { CalendarCheck, Plus } from "lucide-react";
import PlannerStepCard from "./PlannerStepCard";
import StepPicker from "./StepPicker";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface DayPlannerProps {
  t: Translations;
}

export default function DayPlanner({ t }: DayPlannerProps) {
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: dayPlan, mutate } = useSWR<DayPlan>(
    `/api/planner?date=${today}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const handleAddSteps = useCallback(async (stepIds: string[]) => {
    await fetch("/api/planner/steps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskStepIds: stepIds, date: today }),
    });
    mutate();
  }, [today, mutate]);

  const handleComplete = useCallback(async (taskId: string, stepId: string, completed: boolean) => {
    // Optimistic update
    mutate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        steps: prev.steps.map((s) =>
          s.taskStepId === stepId
            ? { ...s, taskStep: { ...s.taskStep, completed, completedAt: completed ? new Date().toISOString() : null } }
            : s
        ),
      };
    }, false);

    await fetch(`/api/tasks/${taskId}/steps/${stepId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    mutate();
  }, [mutate]);

  const handleRemove = useCallback(async (dayPlanStepId: string) => {
    mutate((prev) => {
      if (!prev) return prev;
      return { ...prev, steps: prev.steps.filter((s) => s.id !== dayPlanStepId) };
    }, false);

    await fetch(`/api/planner/steps/${dayPlanStepId}`, { method: "DELETE" });
    mutate();
  }, [mutate]);

  const handleReorder = useCallback(async (stepId: string, direction: "up" | "down") => {
    if (!dayPlan) return;
    const steps = [...dayPlan.steps];
    const idx = steps.findIndex((s) => s.id === stepId);
    if (idx < 0) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= steps.length) return;

    // Swap sortOrders
    const temp = steps[idx].sortOrder;
    steps[idx] = { ...steps[idx], sortOrder: steps[swapIdx].sortOrder };
    steps[swapIdx] = { ...steps[swapIdx], sortOrder: temp };

    // Swap positions in array
    [steps[idx], steps[swapIdx]] = [steps[swapIdx], steps[idx]];

    // Optimistic
    mutate({ ...dayPlan, steps }, false);

    await fetch("/api/planner/steps/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        steps: steps.map((s) => ({ id: s.id, sortOrder: s.sortOrder })),
      }),
    });
    mutate();
  }, [dayPlan, mutate]);

  const activeSteps = dayPlan?.steps.filter((s) => !s.taskStep.completed) || [];
  const completedSteps = dayPlan?.steps.filter((s) => s.taskStep.completed) || [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CalendarCheck className="w-6 h-6 text-[#86EFAC]" />
          <div>
            <h1 className="text-xl font-bold text-[#F8FAFC]">{t.planner.title}</h1>
            <p className="text-xs text-[#64748B]">{new Date(today + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#86EFAC]/10 text-[#86EFAC] border border-[#86EFAC]/20 hover:bg-[#86EFAC]/20 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t.planner.addSteps}
        </button>
      </div>

      {/* Daily Win */}
      <div className="mb-6">
        <input
          type="text"
          placeholder={t.planner.dailyWinPlaceholder}
          defaultValue={dayPlan?.dailyWin || ""}
          onBlur={(e) => {
            const val = e.target.value.trim();
            fetch("/api/planner", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ dailyWin: val || null, date: today }),
            });
          }}
          className="w-full px-4 py-3 rounded-lg bg-[#1E293B]/50 border border-[#334155]/50 text-[#F8FAFC] text-sm placeholder:text-[#475569] focus:outline-none focus:border-[#86EFAC]/30 transition-colors"
        />
      </div>

      {/* Steps */}
      {!dayPlan ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-[#86EFAC] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : dayPlan.steps.length === 0 ? (
        <div className="text-center py-16">
          <CalendarCheck className="w-12 h-12 text-[#334155] mx-auto mb-4" />
          <h3 className="text-[#F8FAFC] font-semibold mb-2">{t.planner.emptyTitle}</h3>
          <p className="text-[#64748B] text-sm mb-6">{t.planner.emptySubtitle}</p>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="px-6 py-2.5 rounded-lg bg-[#86EFAC] text-[#0F172A] font-semibold text-sm hover:bg-emerald-400 transition-colors"
          >
            {t.planner.addFirst}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Active steps */}
          {activeSteps.map((step, i) => (
            <PlannerStepCard
              key={step.id}
              t={t}
              step={step}
              isFirst={i === 0}
              isLast={i === activeSteps.length - 1}
              onComplete={handleComplete}
              onMoveUp={(id) => handleReorder(id, "up")}
              onMoveDown={(id) => handleReorder(id, "down")}
              onRemove={handleRemove}
            />
          ))}

          {/* Completed steps */}
          {completedSteps.length > 0 && (
            <div className="pt-4 border-t border-[#334155]/30">
              <p className="text-xs text-[#64748B] mb-2">
                {completedSteps.length} {t.planner.completed}
              </p>
              {completedSteps.map((step, i) => (
                <PlannerStepCard
                  key={step.id}
                  t={t}
                  step={step}
                  isFirst={i === 0}
                  isLast={i === completedSteps.length - 1}
                  onComplete={handleComplete}
                  onMoveUp={() => {}}
                  onMoveDown={() => {}}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <StepPicker
        t={t}
        open={pickerOpen}
        date={today}
        onClose={() => setPickerOpen(false)}
        onAdd={handleAddSteps}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create the planner page**

`src/app/app/planner/page.tsx`:

```typescript
"use client";

import { useApp } from "@/components/app/AppContext";
import DayPlanner from "@/components/app/DayPlanner";

export default function PlannerPage() {
  const { t } = useApp();
  return <DayPlanner t={t} />;
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 4: Manual test**

Run `npm run dev`, navigate to `/app/planner`. Verify:
1. Empty state shows with "Add your first steps" button
2. StepPicker opens and shows available steps
3. Adding steps shows them in the planner
4. Checkbox toggles completion
5. Up/down arrows reorder
6. X button removes step
7. Daily win saves on blur

- [ ] **Step 5: Commit**

```bash
git add src/components/app/DayPlanner.tsx src/app/app/planner/page.tsx
git commit -m "feat(3B): add DayPlanner page with StepPicker, reorder, completion, and daily win"
```

---

## Chunk 3: Timer, Step Editing & End of Day

### Task 13: useTimer Hook

**Files:**
- Create: `src/hooks/useTimer.ts`

- [ ] **Step 1: Create the useTimer hook**

```typescript
"use client";

import { useState, useEffect, useRef } from "react";

interface UseTimerProps {
  timeSpentSeconds: number;
  timerStartedAt: string | null;
}

export function useTimer({ timeSpentSeconds, timerStartedAt }: UseTimerProps) {
  const [elapsed, setElapsed] = useState(() => {
    if (timerStartedAt) {
      return timeSpentSeconds + Math.floor((Date.now() - new Date(timerStartedAt).getTime()) / 1000);
    }
    return timeSpentSeconds;
  });

  const isRunning = !!timerStartedAt;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerStartedAt) {
      const startTime = new Date(timerStartedAt).getTime();

      const tick = () => {
        setElapsed(timeSpentSeconds + Math.floor((Date.now() - startTime) / 1000));
      };

      tick(); // Sync immediately
      intervalRef.current = setInterval(tick, 1000);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      setElapsed(timeSpentSeconds);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [timerStartedAt, timeSpentSeconds]);

  return { elapsed, isRunning };
}

export function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
```

- [ ] **Step 2: Commit**

```bash
mkdir -p src/hooks && git add src/hooks/useTimer.ts
git commit -m "feat(3B): add useTimer hook with server-synced elapsed time"
```

---

### Task 14: MiniTimer Component

**Files:**
- Create: `src/components/app/MiniTimer.tsx`

- [ ] **Step 1: Create the MiniTimer component**

```typescript
"use client";

import { Play, Pause } from "lucide-react";
import { useTimer, formatTime } from "@/hooks/useTimer";

interface MiniTimerProps {
  timeSpentSeconds: number;
  timerStartedAt: string | null;
  disabled?: boolean;
  onStart: () => void;
  onPause: () => void;
}

export default function MiniTimer({
  timeSpentSeconds,
  timerStartedAt,
  disabled,
  onStart,
  onPause,
}: MiniTimerProps) {
  const { elapsed, isRunning } = useTimer({ timeSpentSeconds, timerStartedAt });

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <span className={`text-xs font-mono tabular-nums ${
        isRunning ? "text-[#86EFAC]" : "text-[#64748B]"
      }`}>
        {formatTime(elapsed)}
      </span>
      <button
        type="button"
        onClick={isRunning ? onPause : onStart}
        disabled={disabled}
        className={`p-1 rounded transition-colors disabled:opacity-30 ${
          isRunning
            ? "text-[#86EFAC] hover:bg-[#86EFAC]/10 animate-pulse"
            : "text-[#64748B] hover:text-[#F8FAFC]"
        }`}
      >
        {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/app/MiniTimer.tsx
git commit -m "feat(3B): add MiniTimer component with play/pause and live display"
```

---

### Task 15: Integrate Timer + Step Editing into PlannerStepCard

**Files:**
- Modify: `src/components/app/PlannerStepCard.tsx`

- [ ] **Step 1: Add timer and inline editing to PlannerStepCard**

Update `src/components/app/PlannerStepCard.tsx` to import MiniTimer and add editing:

Add imports at the top:
```typescript
import { useState, useRef } from "react";
import MiniTimer from "./MiniTimer";
```

Update the props interface to add timer and edit callbacks:
```typescript
interface PlannerStepCardProps {
  t: Translations;
  step: DayPlanStepWithDetails;
  isFirst: boolean;
  isLast: boolean;
  onComplete: (taskId: string, stepId: string, completed: boolean) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onRemove: (id: string) => void;
  onTimerStart: (id: string) => void;
  onTimerPause: (id: string) => void;
  onEditStep: (taskId: string, stepId: string, text: string | null) => void;
}
```

Inside the component, add editing state before the return:
```typescript
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(displayText);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleEditSave() {
    setEditing(false);
    const trimmed = editText.trim();
    if (trimmed && trimmed !== ts.text) {
      onEditStep(ts.task.id, ts.id, trimmed);
    } else if (trimmed === ts.text) {
      onEditStep(ts.task.id, ts.id, null); // Reset to original
    }
  }
```

Replace the text `<span>` with an editable version:
```tsx
      {/* Text */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleEditSave}
            onKeyDown={(e) => { if (e.key === "Enter") handleEditSave(); if (e.key === "Escape") { setEditing(false); setEditText(displayText); } }}
            className="w-full bg-transparent text-sm text-[#F8FAFC] border-b border-[#86EFAC]/30 focus:outline-none py-0.5"
            autoFocus
          />
        ) : (
          <span
            onClick={() => { if (!ts.completed) { setEditing(true); } }}
            className={`text-sm leading-relaxed cursor-text ${
              ts.completed ? "text-[#94A3B8] line-through cursor-default" : "text-[#F8FAFC]"
            }`}
          >
            {displayText}
          </span>
        )}
        {ts.userEditedText && !editing && !ts.completed && (
          <button
            type="button"
            onClick={() => onEditStep(ts.task.id, ts.id, null)}
            className="block text-[10px] text-[#64748B] hover:text-[#86EFAC] transition-colors mt-0.5"
          >
            {t.planner.resetToOriginal}
          </button>
        )}
        {ts.durationEstimate && !ts.completed && !editing && (
          <span className="inline-flex items-center w-fit gap-1 ml-2 px-1.5 py-0.5 rounded-md bg-[#334155]/40 text-[#86EFAC] text-[10px] font-medium border border-[#86EFAC]/10">
            <Clock className="w-2.5 h-2.5" />
            {ts.durationEstimate}
          </span>
        )}
        {project && !editing && (
          <div className="mt-1 text-[10px] text-[#64748B]">
            {project.emoji} {project.name}
          </div>
        )}
      </div>
```

Add MiniTimer before the reorder actions (inside the non-completed block):
```tsx
      {/* Timer */}
      {!ts.completed && (
        <MiniTimer
          timeSpentSeconds={step.timeSpentSeconds}
          timerStartedAt={step.timerStartedAt}
          onStart={() => onTimerStart(step.id)}
          onPause={() => onTimerPause(step.id)}
        />
      )}
```

- [ ] **Step 2: Update DayPlanner to pass timer and edit callbacks**

In `src/components/app/DayPlanner.tsx`, add these callbacks:

```typescript
  const handleTimerStart = useCallback(async (dayPlanStepId: string) => {
    await fetch(`/api/planner/steps/${dayPlanStepId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });
    mutate();
  }, [mutate]);

  const handleTimerPause = useCallback(async (dayPlanStepId: string) => {
    await fetch(`/api/planner/steps/${dayPlanStepId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pause" }),
    });
    mutate();
  }, [mutate]);

  const handleEditStep = useCallback(async (taskId: string, stepId: string, text: string | null) => {
    await fetch(`/api/tasks/${taskId}/steps/${stepId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userEditedText: text }),
    });
    mutate();
  }, [mutate]);
```

Also update the `handleComplete` to auto-pause timer if running:
```typescript
  const handleComplete = useCallback(async (taskId: string, stepId: string, completed: boolean) => {
    // If completing and timer is running on this step, pause first
    if (completed) {
      const runningStep = dayPlan?.steps.find((s) => s.taskStepId === stepId && s.timerStartedAt);
      if (runningStep) {
        await fetch(`/api/planner/steps/${runningStep.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "pause" }),
        });
      }
    }

    // Optimistic update
    mutate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        steps: prev.steps.map((s) =>
          s.taskStepId === stepId
            ? { ...s, taskStep: { ...s.taskStep, completed, completedAt: completed ? new Date().toISOString() : null } }
            : s
        ),
      };
    }, false);

    await fetch(`/api/tasks/${taskId}/steps/${stepId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    mutate();
  }, [dayPlan, mutate]);
```

Update PlannerStepCard usage to pass new props:
```tsx
            <PlannerStepCard
              key={step.id}
              t={t}
              step={step}
              isFirst={i === 0}
              isLast={i === activeSteps.length - 1}
              onComplete={handleComplete}
              onMoveUp={(id) => handleReorder(id, "up")}
              onMoveDown={(id) => handleReorder(id, "down")}
              onRemove={handleRemove}
              onTimerStart={handleTimerStart}
              onTimerPause={handleTimerPause}
              onEditStep={handleEditStep}
            />
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 4: Manual test**

Run `npm run dev`, navigate to `/app/planner`:
1. Timer: start → displays counting MM:SS, green pulse. Start another → first pauses.
2. Click step text → inline edit. Blur/Enter saves. "Reset to original" appears.
3. Complete step while timer running → timer pauses, step moves to completed section.

- [ ] **Step 5: Commit**

```bash
git add src/components/app/PlannerStepCard.tsx src/components/app/DayPlanner.tsx
git commit -m "feat(3B): integrate MiniTimer, inline step editing, and auto-pause on complete"
```

---

### Task 16: EndOfDayView

**Files:**
- Create: `src/components/app/EndOfDayView.tsx`
- Modify: `src/components/app/DayPlanner.tsx`

- [ ] **Step 1: Create EndOfDayView component**

```typescript
"use client";

import { useState } from "react";
import type { Translations } from "@/lib/i18n";
import type { DayPlan } from "@/types";
import { formatTime } from "@/hooks/useTimer";
import { X } from "lucide-react";

const MOOD_EMOJIS = ["😣", "😕", "😐", "🙂", "😄"];

interface EndOfDayViewProps {
  t: Translations;
  dayPlan: DayPlan;
  onSave: (data: { dailyWin: string | null; reflection: string | null; mood: number | null }) => void;
  onClose: () => void;
}

export default function EndOfDayView({ t, dayPlan, onSave, onClose }: EndOfDayViewProps) {
  const [dailyWin, setDailyWin] = useState(dayPlan.dailyWin || "");
  const [reflection, setReflection] = useState(dayPlan.reflection || "");
  const [mood, setMood] = useState<number | null>(dayPlan.mood);

  const totalSteps = dayPlan.steps.length;
  const completedSteps = dayPlan.steps.filter((s) => s.taskStep.completed).length;
  const totalSeconds = dayPlan.steps.reduce((acc, s) => {
    let elapsed = s.timeSpentSeconds;
    if (s.timerStartedAt) {
      elapsed += Math.floor((Date.now() - new Date(s.timerStartedAt).getTime()) / 1000);
    }
    return acc + elapsed;
  }, 0);

  function handleSave() {
    onSave({
      dailyWin: dailyWin.trim() || null,
      reflection: reflection.trim() || null,
      mood,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-[#1E293B] border border-[#334155] rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#334155]">
          <h2 className="text-[#F8FAFC] font-bold text-lg">{t.endOfDay.title}</h2>
          <button type="button" onClick={onClose} className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Stats */}
          <div className="flex gap-4">
            <div className="flex-1 rounded-lg bg-[#0F172A]/50 p-3 text-center">
              <div className="text-2xl font-bold text-[#86EFAC]">{completedSteps}/{totalSteps}</div>
              <div className="text-xs text-[#64748B]">{t.endOfDay.stepsCompleted}</div>
            </div>
            <div className="flex-1 rounded-lg bg-[#0F172A]/50 p-3 text-center">
              <div className="text-2xl font-bold text-[#86EFAC]">{formatTime(totalSeconds)}</div>
              <div className="text-xs text-[#64748B]">{t.endOfDay.totalTime}</div>
            </div>
          </div>

          {/* Daily Win */}
          <div>
            <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">{t.endOfDay.dailyWinLabel}</label>
            <input
              type="text"
              value={dailyWin}
              onChange={(e) => setDailyWin(e.target.value)}
              placeholder={t.endOfDay.dailyWinPlaceholder}
              className="w-full px-3 py-2 rounded-lg bg-[#0F172A]/50 border border-[#334155] text-[#F8FAFC] text-sm placeholder:text-[#475569] focus:outline-none focus:border-[#86EFAC]/30"
            />
          </div>

          {/* Mood */}
          <div>
            <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">{t.endOfDay.moodLabel}</label>
            <div className="flex gap-2 justify-center">
              {MOOD_EMOJIS.map((emoji, i) => {
                const value = i + 1;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMood(mood === value ? null : value)}
                    className={`text-2xl p-2 rounded-lg transition-all ${
                      mood === value ? "bg-[#86EFAC]/20 scale-110" : "hover:bg-[#334155]/50"
                    }`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reflection */}
          <div>
            <label className="block text-sm font-medium text-[#F8FAFC] mb-1.5">{t.endOfDay.reflectionLabel}</label>
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder={t.endOfDay.reflectionPlaceholder}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-[#0F172A]/50 border border-[#334155] text-[#F8FAFC] text-sm placeholder:text-[#475569] focus:outline-none focus:border-[#86EFAC]/30 resize-none"
            />
          </div>

          {/* Rollover checkbox */}
          {incompleteStepCount > 0 && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rollover}
                onChange={(e) => setRollover(e.target.checked)}
                className="rounded border-[#334155] bg-[#0F172A]/50 text-[#86EFAC] focus:ring-[#86EFAC]/30"
              />
              <span className="text-sm text-[#94A3B8]">{t.endOfDay.rolloverLabel} ({incompleteStepCount})</span>
            </label>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#334155]">
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-2.5 rounded-lg bg-[#86EFAC] text-[#0F172A] font-semibold text-sm hover:bg-emerald-400 transition-colors"
          >
            {t.endOfDay.saveClose}
          </button>
        </div>
      </div>
    </div>
  );
}
```

Add rollover state and calculation to the component (add before the `return`):

```typescript
  const [rollover, setRollover] = useState(true);
  const incompleteStepCount = dayPlan.steps.filter((s) => !s.taskStep.completed).length;
```

Update the `EndOfDayViewProps.onSave` signature to include rollover:
```typescript
  onSave: (data: { dailyWin: string | null; reflection: string | null; mood: number | null; rollover: boolean }) => void;
```

Update `handleSave` to pass rollover:
```typescript
  function handleSave() {
    onSave({
      dailyWin: dailyWin.trim() || null,
      reflection: reflection.trim() || null,
      mood,
      rollover,
    });
    onClose();
  }
```

- [ ] **Step 2: Add EndOfDayView to DayPlanner**

In `src/components/app/DayPlanner.tsx`, add import:
```typescript
import EndOfDayView from "./EndOfDayView";
```

Add state:
```typescript
  const [endOfDayOpen, setEndOfDayOpen] = useState(false);
```

Add save handler:
```typescript
  const handleEndOfDaySave = useCallback(async (data: { dailyWin: string | null; reflection: string | null; mood: number | null; rollover: boolean }) => {
    const { rollover, ...planData } = data;

    await fetch("/api/planner", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...planData, date: today }),
    });

    // Roll over incomplete steps to tomorrow
    if (rollover && dayPlan) {
      const incompleteStepIds = dayPlan.steps
        .filter((s) => !s.taskStep.completed)
        .map((s) => s.taskStepId);

      if (incompleteStepIds.length > 0) {
        const tomorrow = new Date(today + "T12:00:00");
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toLocaleDateString("en-CA");

        await fetch("/api/planner/steps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskStepIds: incompleteStepIds, date: tomorrowStr }),
        });
      }
    }

    mutate();
  }, [today, dayPlan, mutate]);
```

Add "Wrap up" button next to "Add Steps" in the header (only when plan has steps):
```tsx
        {dayPlan && dayPlan.steps.length > 0 && (
          <button
            type="button"
            onClick={() => setEndOfDayOpen(true)}
            className="px-4 py-2 rounded-lg bg-[#334155]/50 text-[#F8FAFC] border border-[#334155] hover:bg-[#334155] text-sm font-medium transition-colors"
          >
            {t.planner.wrapUp}
          </button>
        )}
```

Add the modal before the closing `</div>` of the component:
```tsx
      {endOfDayOpen && dayPlan && (
        <EndOfDayView
          t={t}
          dayPlan={dayPlan}
          onSave={handleEndOfDaySave}
          onClose={() => setEndOfDayOpen(false)}
        />
      )}
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 4: Manual test**

1. Add steps, complete some, track time
2. Click "Wrap up" → EndOfDayView shows stats, pre-fills daily win
3. Select mood, write reflection, save
4. Verify data persists (reload page, check daily win value)

- [ ] **Step 5: Commit**

```bash
git add src/components/app/EndOfDayView.tsx src/components/app/DayPlanner.tsx
git commit -m "feat(3B): add EndOfDayView with stats, mood, reflection, and daily win"
```

---

### Task 17: Add HintTooltips to Existing Features

**Files:**
- Modify: `src/components/app/PlannerStepCard.tsx` (time estimate hint)
- Modify: `src/components/app/DayPlanner.tsx` (planner hints)

- [ ] **Step 1: Add time estimate hint to PlannerStepCard**

In `PlannerStepCard.tsx`, import HintTooltip:
```typescript
import { HintTooltip } from "@/components/ui/hint-tooltip";
```

Next to the duration estimate badge, add the hint:
```tsx
        {ts.durationEstimate && !ts.completed && !editing && (
          <span className="inline-flex items-center w-fit gap-1 ml-2 px-1.5 py-0.5 rounded-md bg-[#334155]/40 text-[#86EFAC] text-[10px] font-medium border border-[#86EFAC]/10">
            <Clock className="w-2.5 h-2.5" />
            {ts.durationEstimate}
            <HintTooltip text={t.hints.timeEstimate} />
          </span>
        )}
```

- [ ] **Step 2: Add daily win and mood hints to DayPlanner and EndOfDayView**

In `EndOfDayView.tsx`, import:
```typescript
import { HintTooltip } from "@/components/ui/hint-tooltip";
```

Add hint next to daily win label:
```tsx
<label className="flex items-center gap-1 text-sm font-medium text-[#F8FAFC] mb-1.5">
  {t.endOfDay.dailyWinLabel}
  <HintTooltip text={t.hints.dailyWin} />
</label>
```

Add hint next to mood label:
```tsx
<label className="flex items-center gap-1 text-sm font-medium text-[#F8FAFC] mb-1.5">
  {t.endOfDay.moodLabel}
  <HintTooltip text={t.hints.moodSelector} />
</label>
```

- [ ] **Step 3: Add hint to MiniTimer**

In `src/components/app/MiniTimer.tsx`, import HintTooltip:
```typescript
import { HintTooltip } from "@/components/ui/hint-tooltip";
```

Add a `hintText` prop:
```typescript
interface MiniTimerProps {
  timeSpentSeconds: number;
  timerStartedAt: string | null;
  disabled?: boolean;
  hintText?: string;
  onStart: () => void;
  onPause: () => void;
}
```

After the play/pause button, conditionally render the hint (only show on first timer in the list to avoid clutter):
```tsx
      {hintText && <HintTooltip text={hintText} />}
```

Pass `hintText={i === 0 ? t.hints.miniTimer : undefined}` from DayPlanner when rendering the first PlannerStepCard.

- [ ] **Step 4: Add hint to planner empty state**

In `src/components/app/DayPlanner.tsx`, import HintTooltip and add it to the empty state:
```tsx
import { HintTooltip } from "@/components/ui/hint-tooltip";
```

In the empty state subtitle:
```tsx
          <p className="text-[#64748B] text-sm mb-6 flex items-center gap-1 justify-center">
            {t.planner.emptySubtitle}
            <HintTooltip text={t.hints.plannerEmpty} />
          </p>
```

- [ ] **Step 5: Verify build**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 6: Commit**

```bash
git add src/components/app/PlannerStepCard.tsx src/components/app/DayPlanner.tsx src/components/app/EndOfDayView.tsx src/components/app/MiniTimer.tsx
git commit -m "feat(3B): add contextual HintTooltips to time estimates, daily win, mood, timer, and empty state"
```

---

### Task 18: Sidebar Timer Indicator

**Files:**
- Modify: `src/components/app/Sidebar.tsx`
- Modify: `src/components/app/AppShellLayout.tsx`

- [ ] **Step 1: Add `hasActiveTimer` prop to Sidebar**

In `src/components/app/Sidebar.tsx`, add to `SidebarProps`:
```typescript
  hasActiveTimer?: boolean;
```

In the planner nav item rendering, add a pulsing dot when timer is active. Inside the nav link for the planner item (identified by `href === "/app/planner"`), after the label span:
```tsx
{!collapsed && item.href === "/app/planner" && hasActiveTimer && (
  <span className="ml-auto flex h-2 w-2 rounded-full bg-[#86EFAC] animate-pulse" />
)}
```

- [ ] **Step 2: Pass `hasActiveTimer` from AppShellLayout**

This requires knowing if any timer is running. The simplest approach: add optional `hasActiveTimer` state to AppShellLayout, and have the DayPlanner page update it via a callback in AppContext.

In `src/components/app/AppContext.tsx`, add to the context type:
```typescript
  onActiveTimerChange?: (active: boolean) => void;
```

In `AppShellLayout.tsx`, add state and pass to context and Sidebar:
```typescript
const [hasActiveTimer, setHasActiveTimer] = useState(false);
```

Add to `contextValue`:
```typescript
  onActiveTimerChange: setHasActiveTimer,
```

Pass to Sidebar:
```tsx
<Sidebar t={t} projects={projects} onNewProject={() => setCreateProjectOpen(true)} hasActiveTimer={hasActiveTimer} />
```

In `DayPlanner.tsx`, call `onActiveTimerChange` when timer state changes:
```typescript
const { t, onActiveTimerChange } = useApp();

// After mutate in timer start/pause handlers:
useEffect(() => {
  if (!dayPlan || !onActiveTimerChange) return;
  const hasRunning = dayPlan.steps.some((s) => s.timerStartedAt);
  onActiveTimerChange(hasRunning);
}, [dayPlan, onActiveTimerChange]);
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add src/components/app/Sidebar.tsx src/components/app/AppShellLayout.tsx src/components/app/AppContext.tsx src/components/app/DayPlanner.tsx
git commit -m "feat(3B): add active timer indicator to sidebar planner link"
```

---

### Task 19: Final Build Verification + Cleanup

**Files:**
- Verify: `src/app/shared/[shareToken]/SharedTaskView.tsx` (a11y fixes from earlier)

- [ ] **Step 1: Commit the a11y fixes from earlier**

```bash
git add src/app/shared/[shareToken]/SharedTaskView.tsx
git commit -m "fix: resolve a11y issues — add main landmark and fix aria-hidden on focusable element"
```

- [ ] **Step 2: Full build verification**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: No new lint errors.

- [ ] **Step 4: Update todo.md with Sprint 3B progress**

Mark Sprint 3B items as complete in `agents/claude/tasks/todo.md`.

- [ ] **Step 5: Commit**

```bash
git add agents/claude/tasks/todo.md
git commit -m "chore: update todo with Sprint 3B progress"
```
