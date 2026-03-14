import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// --- Zod schema for timer actions ---
const TimerActionSchema = z.object({
  action: z.enum(["start", "pause"]),
});

/**
 * DELETE /api/planner/steps/[id] — Remove a step from the day plan
 *
 * Verifies the DayPlanStep exists and belongs to the authenticated user
 * (via dayPlan.profileId), then deletes it.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  // --- Verify the DayPlanStep exists and belongs to this user ---
  const dayPlanStep = await prisma.dayPlanStep.findUnique({
    where: { id },
    include: { dayPlan: { select: { profileId: true } } },
  });

  if (!dayPlanStep || dayPlanStep.dayPlan.profileId !== profile.id) {
    return NextResponse.json(
      { error: "Step not found in your plan" },
      { status: 404 }
    );
  }

  // --- Delete the step from the plan ---
  await prisma.dayPlanStep.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

/**
 * PATCH /api/planner/steps/[id] — Timer actions (start / pause)
 *
 * - "start": Starts the timer on this step. Atomically pauses any other
 *   running timer in the same DayPlan (prevents multiple timers running).
 *   Cannot start on a completed step.
 * - "pause": Pauses the running timer and accumulates elapsed time.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  const parsed = TimerActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { action } = parsed.data;

  // --- Verify the DayPlanStep exists and belongs to this user ---
  const dayPlanStep = await prisma.dayPlanStep.findUnique({
    where: { id },
    include: {
      dayPlan: { select: { id: true, profileId: true } },
      taskStep: { select: { completed: true } },
    },
  });

  if (!dayPlanStep || dayPlanStep.dayPlan.profileId !== profile.id) {
    return NextResponse.json(
      { error: "Step not found in your plan" },
      { status: 404 }
    );
  }

  // --- Handle "start" action ---
  if (action === "start") {
    // Cannot start timer on a completed step
    if (dayPlanStep.taskStep.completed) {
      return NextResponse.json(
        { error: "Cannot start timer on a completed step" },
        { status: 400 }
      );
    }

    // Use $transaction to atomically pause any running timer + start this one.
    // This prevents data corruption from concurrent requests.
    const updated = await prisma.$transaction(async (tx) => {
      // Find any currently running timer in the same DayPlan
      const runningStep = await tx.dayPlanStep.findFirst({
        where: {
          dayPlanId: dayPlanStep.dayPlan.id,
          timerStartedAt: { not: null },
          id: { not: id }, // Exclude the step we're about to start
        },
      });

      // Pause the running timer if one exists
      if (runningStep && runningStep.timerStartedAt) {
        const elapsed = Math.floor(
          (Date.now() - runningStep.timerStartedAt.getTime()) / 1000
        );
        await tx.dayPlanStep.update({
          where: { id: runningStep.id },
          data: {
            timeSpentSeconds: runningStep.timeSpentSeconds + elapsed,
            timerStartedAt: null,
          },
        });
      }

      // Start the timer on this step
      return tx.dayPlanStep.update({
        where: { id },
        data: { timerStartedAt: new Date() },
      });
    });

    return NextResponse.json(updated);
  }

  // --- Handle "pause" action ---
  if (action === "pause") {
    // Cannot pause if timer is not running
    if (!dayPlanStep.timerStartedAt) {
      return NextResponse.json(
        { error: "Timer is not running on this step" },
        { status: 400 }
      );
    }

    // Calculate elapsed time and accumulate
    const elapsed = Math.floor(
      (Date.now() - dayPlanStep.timerStartedAt.getTime()) / 1000
    );

    const updated = await prisma.dayPlanStep.update({
      where: { id },
      data: {
        timeSpentSeconds: dayPlanStep.timeSpentSeconds + elapsed,
        timerStartedAt: null,
      },
    });

    return NextResponse.json(updated);
  }

  // Shouldn't reach here due to Zod validation, but just in case
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
