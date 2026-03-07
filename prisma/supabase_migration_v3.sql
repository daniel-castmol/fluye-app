-- Migration V3: Duration Estimates & Progression Tracking

-- Add durationEstimate to TaskStep
ALTER TABLE "TaskStep" ADD COLUMN "durationEstimate" TEXT;

-- Add progression fields to UserProfile
ALTER TABLE "UserProfile" ADD COLUMN "totalTasksCompleted" INTEGER DEFAULT 0;
ALTER TABLE "UserProfile" ADD COLUMN "currentStreak" INTEGER DEFAULT 0;
ALTER TABLE "UserProfile" ADD COLUMN "lastCompletionDate" TIMESTAMP WITH TIME ZONE;
