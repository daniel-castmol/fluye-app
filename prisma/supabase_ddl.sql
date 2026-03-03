-- Fluye Database Schema for Supabase
-- Paste this into Supabase Dashboard → SQL Editor → Run
-- This is the FULL schema (for fresh setups). For existing DBs, use supabase_migration_v2.sql instead.

-- Create UserProfile table
CREATE TABLE "UserProfile" (
    "id"                   TEXT         NOT NULL DEFAULT gen_random_uuid(),
    "userId"               TEXT         NOT NULL,
    "email"                TEXT         NOT NULL,
    "name"                 TEXT         NOT NULL,

    -- Context for AI personalization
    "roleWork"             TEXT,
    "projects"             TEXT,

    -- Language preference: "en" | "es"
    "preferredLanguage"    TEXT         NOT NULL DEFAULT 'en',

    -- Subscription
    "subscriptionStatus"   TEXT         NOT NULL DEFAULT 'free',
    "stripeCustomerId"     TEXT,

    -- Rate limiting: task breakdowns
    "taskBreakdownsToday"  INTEGER      NOT NULL DEFAULT 0,
    "lastBreakdownReset"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Rate limiting: clarify requests
    "clarifyRequestsToday" INTEGER      NOT NULL DEFAULT 0,
    "lastClarifyReset"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- Create Task table
-- NOTE: profileId references UserProfile.id (NOT Supabase auth user ID)
CREATE TABLE "Task" (
    "id"            TEXT         NOT NULL DEFAULT gen_random_uuid(),
    "profileId"     TEXT         NOT NULL,
    "originalText"  TEXT         NOT NULL,
    "clarification" TEXT,
    "status"        TEXT         NOT NULL DEFAULT 'active',
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    "completedAt"   TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- Create TaskStep table
CREATE TABLE "TaskStep" (
    "id"          TEXT         NOT NULL DEFAULT gen_random_uuid(),
    "taskId"      TEXT         NOT NULL,
    "text"        TEXT         NOT NULL,
    "order"       INTEGER      NOT NULL,
    "completed"   BOOLEAN      NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskStep_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "UserProfile_userId_key"  ON "UserProfile"("userId");
CREATE UNIQUE INDEX "UserProfile_email_key"   ON "UserProfile"("email");

-- Performance indexes
CREATE INDEX "Task_profileId_status_idx"    ON "Task"("profileId", "status");
CREATE INDEX "TaskStep_taskId_order_idx"    ON "TaskStep"("taskId", "order");

-- Foreign keys
ALTER TABLE "Task" ADD CONSTRAINT "Task_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskStep" ADD CONSTRAINT "TaskStep_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
