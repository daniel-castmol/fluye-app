-- Sprint 3A: Add Project model and Task.projectId
-- Apply via Supabase Dashboard SQL Editor, then run `npx prisma generate`

CREATE TABLE "Project" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "profileId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "emoji" TEXT NOT NULL DEFAULT '📁',
  "color" TEXT NOT NULL DEFAULT '#86EFAC',
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Project" ADD CONSTRAINT "Project_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE;

CREATE INDEX "Project_profileId_status_idx" ON "Project"("profileId", "status");

ALTER TABLE "Task" ADD COLUMN "projectId" TEXT;

ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL;

CREATE INDEX "Task_projectId_status_idx" ON "Task"("projectId", "status");
