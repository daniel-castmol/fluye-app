import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// --- Zod schema: 1-50 task step UUIDs, optional date ---
const AddStepsSchema = z.object({
  taskStepIds: z.array(z.string().uuid()).min(1).max(50),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/**
 * POST /api/planner/steps — Add multiple steps to today's plan at once
 *
 * Takes an array of TaskStep IDs and assigns them to the user's DayPlan
 * for the given date (defaults to today). Skips duplicates and assigns
 * sequential sortOrder after existing steps.
 */
export async function POST(request: Request) {
  // --- Auth: verify user session and resolve profile ---
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.userProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 400 });
  }

  // --- Parse and validate request body ---
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = AddStepsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { taskStepIds, date: dateStr } = parsed.data;

  // --- Resolve date (default to today UTC) ---
  let date: Date;
  if (dateStr) {
    date = new Date(dateStr + "T00:00:00.000Z");
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }
  } else {
    const now = new Date();
    date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
  }

  // --- Verify all steps belong to the authenticated user ---
  const steps = await prisma.taskStep.findMany({
    where: {
      id: { in: taskStepIds },
      task: { profileId: profile.id },
    },
    select: { id: true },
  });

  const validStepIds = new Set(steps.map((s) => s.id));
  const invalidIds = taskStepIds.filter((id) => !validStepIds.has(id));

  if (invalidIds.length > 0) {
    return NextResponse.json(
      { error: "Some step IDs are invalid or do not belong to you" },
      { status: 403 }
    );
  }

  // --- Upsert DayPlan for this date (create if doesn't exist) ---
  const dayPlan = await prisma.dayPlan.upsert({
    where: {
      profileId_date: {
        profileId: profile.id,
        date,
      },
    },
    create: {
      profileId: profile.id,
      date,
    },
    update: {},
  });

  // --- Find which steps are already in this plan (skip duplicates) ---
  const existingPlanSteps = await prisma.dayPlanStep.findMany({
    where: { dayPlanId: dayPlan.id },
    select: { taskStepId: true, sortOrder: true },
  });

  const alreadyInPlan = new Set(existingPlanSteps.map((s) => s.taskStepId));
  const newStepIds = taskStepIds.filter((id) => !alreadyInPlan.has(id));

  if (newStepIds.length === 0) {
    return NextResponse.json({ added: 0 }, { status: 201 });
  }

  // --- Assign sortOrder sequentially after the current max ---
  const maxSortOrder =
    existingPlanSteps.length > 0
      ? Math.max(...existingPlanSteps.map((s) => s.sortOrder))
      : -1;

  const createData = newStepIds.map((taskStepId, index) => ({
    dayPlanId: dayPlan.id,
    taskStepId,
    sortOrder: maxSortOrder + 1 + index,
  }));

  await prisma.dayPlanStep.createMany({ data: createData });

  return NextResponse.json({ added: newStepIds.length }, { status: 201 });
}
