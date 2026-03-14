import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/planner/available?date=YYYY-MM-DD
 *
 * Returns all incomplete TaskSteps that are NOT already in today's DayPlan.
 * Used by the StepPicker UI to let users add steps to their daily plan.
 *
 * Each step includes:
 * - task info (original text, project details)
 * - `fromYesterday` flag — true if the step was in yesterday's plan
 *   (lets the UI show "Roll over from yesterday?" prompt)
 */
export async function GET(request: NextRequest) {
  // --- Auth ---
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

  // --- Parse date param (default to today) ---
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD." }, { status: 400 });
  }

  const targetDate = new Date(dateStr + "T00:00:00.000Z");

  try {
    // --- Get today's DayPlan step IDs to exclude ---
    const todayPlan = await prisma.dayPlan.findUnique({
      where: { profileId_date: { profileId: profile.id, date: targetDate } },
      include: { steps: { select: { taskStepId: true } } },
    });

    const excludeIds = todayPlan?.steps.map((s) => s.taskStepId) ?? [];

    // --- Get yesterday's DayPlan step IDs for `fromYesterday` detection ---
    const yesterday = new Date(targetDate);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    const yesterdayPlan = await prisma.dayPlan.findUnique({
      where: { profileId_date: { profileId: profile.id, date: yesterday } },
      include: { steps: { select: { taskStepId: true } } },
    });

    const yesterdayStepIds = new Set(
      yesterdayPlan?.steps.map((s) => s.taskStepId) ?? []
    );

    // --- Query all incomplete steps from user's active tasks, excluding already-planned ones ---
    const availableSteps = await prisma.taskStep.findMany({
      where: {
        completed: false,
        // Only exclude if there are IDs to exclude (empty array would be a no-op)
        id: excludeIds.length > 0 ? { notIn: excludeIds } : undefined,
        task: {
          profileId: profile.id,
          status: "active",
        },
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

    // --- Map results to include project info + fromYesterday flag ---
    const result = availableSteps.map((step) => ({
      id: step.id,
      text: step.text,
      userEditedText: step.userEditedText,
      order: step.order,
      durationEstimate: step.durationEstimate,
      taskId: step.taskId,
      taskName: step.task.originalText,
      project: step.task.project,
      // Flag steps that were in yesterday's plan — UI can prompt "Roll over?"
      fromYesterday: yesterdayStepIds.has(step.id),
    }));

    return NextResponse.json({ steps: result });
  } catch (error) {
    console.error("[planner/available] Error fetching available steps:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
