-- =============================================================================
-- Sprint 3B: Day Planner — SQL Migration
-- =============================================================================
-- This migration creates the tables needed for the Day Planner feature:
--   - DayPlan: One plan per user per day (stores daily win, reflection, mood)
--   - DayPlanStep: Links TaskSteps to a DayPlan (with timer tracking + ordering)
--   - TaskStep.userEditedText: Allows users to edit AI-generated step text
--
-- HOW TO APPLY: Copy this into Supabase Dashboard > SQL Editor > Run
-- Then run: npx prisma generate
-- =============================================================================

-- DayPlan: one entry per user per date
-- This is the "container" for a user's daily plan. It holds the date,
-- plus end-of-day reflection data (daily win, mood, reflection text).
-- NOTE: Using TEXT for IDs to match existing table conventions (UserProfile, Task, TaskStep all use TEXT)
CREATE TABLE IF NOT EXISTS "DayPlan" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "profileId" TEXT NOT NULL REFERENCES "UserProfile"("id") ON DELETE CASCADE,
  "date" DATE NOT NULL,
  "dailyWin" TEXT,        -- "One thing you're proud of today"
  "reflection" TEXT,      -- Free-text end-of-day note
  "mood" INTEGER,         -- 1-5 scale (maps to emojis in UI: 😣😕😐🙂😄)
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Each user can only have one plan per date
  CONSTRAINT "DayPlan_profileId_date_key" UNIQUE ("profileId", "date")
);

-- Fast lookup: find a user's plan for a specific date
CREATE INDEX "DayPlan_profileId_date_idx" ON "DayPlan"("profileId", "date");

-- DayPlanStep: join table linking TaskSteps to a DayPlan
-- Each row = "this step is part of today's plan"
-- Also tracks time spent (via timerStartedAt + timeSpentSeconds pattern)
CREATE TABLE IF NOT EXISTS "DayPlanStep" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "dayPlanId" TEXT NOT NULL REFERENCES "DayPlan"("id") ON DELETE CASCADE,
  "taskStepId" TEXT NOT NULL REFERENCES "TaskStep"("id") ON DELETE CASCADE,
  "sortOrder" INTEGER NOT NULL,           -- Display order in the planner UI
  "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0,  -- Accumulated time from paused sessions
  "timerStartedAt" TIMESTAMP(3),          -- Non-null = timer is currently running
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Fast lookup: get all steps for a plan, ordered
CREATE INDEX "DayPlanStep_dayPlanId_sortOrder_idx" ON "DayPlanStep"("dayPlanId", "sortOrder");

-- Add userEditedText to TaskStep
-- When set, the UI displays this instead of the AI-generated text.
-- Setting it to NULL reverts to the original AI text ("reset to original").
ALTER TABLE "TaskStep" ADD COLUMN IF NOT EXISTS "userEditedText" TEXT;
