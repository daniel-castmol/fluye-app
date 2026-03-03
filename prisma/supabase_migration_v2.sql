-- Fluye V2 Migration
-- Paste into: Supabase Dashboard → SQL Editor → Run
-- Adds: preferredLanguage, clarify rate limit fields, renames Task.userId → profileId

-- ============================================================
-- 1. Add new columns to UserProfile
-- ============================================================
ALTER TABLE "UserProfile"
  ADD COLUMN IF NOT EXISTS "preferredLanguage"     TEXT         NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS "clarifyRequestsToday"  INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastClarifyReset"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ============================================================
-- 2. Rename Task.userId → Task.profileId
--    (userId on Task references UserProfile.id — not Supabase auth UID — rename for clarity)
-- ============================================================
ALTER TABLE "Task" RENAME COLUMN "userId" TO "profileId";

-- 3. Rename the FK constraint to match
ALTER TABLE "Task" RENAME CONSTRAINT "Task_userId_fkey" TO "Task_profileId_fkey";

-- 4. Replace the index with the correct column name
DROP INDEX IF EXISTS "Task_userId_status_idx";
CREATE INDEX IF NOT EXISTS "Task_profileId_status_idx" ON "Task"("profileId", "status");
