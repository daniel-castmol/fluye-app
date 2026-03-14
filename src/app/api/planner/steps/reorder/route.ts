import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// --- Zod schema: array of step ID + new sortOrder pairs ---
const ReorderSchema = z.object({
  steps: z
    .array(
      z.object({
        id: z.string().uuid(),
        sortOrder: z.number().int().min(0),
      })
    )
    .min(1)
    .max(100),
});

/**
 * PATCH /api/planner/steps/reorder — Update sort order for multiple steps
 *
 * Accepts an array of { id, sortOrder } pairs and updates them all
 * in a single transaction. Verifies all steps belong to the user.
 */
export async function PATCH(request: Request) {
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

  const parsed = ReorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { steps } = parsed.data;
  const stepIds = steps.map((s) => s.id);

  // --- Verify all steps belong to this user (via dayPlan.profileId) ---
  const existingSteps = await prisma.dayPlanStep.findMany({
    where: { id: { in: stepIds } },
    include: { dayPlan: { select: { profileId: true } } },
  });

  // Check that we found all steps and they all belong to this user
  if (existingSteps.length !== stepIds.length) {
    return NextResponse.json(
      { error: "Some steps were not found" },
      { status: 404 }
    );
  }

  const unauthorized = existingSteps.some(
    (s) => s.dayPlan.profileId !== profile.id
  );
  if (unauthorized) {
    return NextResponse.json(
      { error: "Some steps do not belong to you" },
      { status: 403 }
    );
  }

  // --- Update all sortOrders atomically in a transaction ---
  await prisma.$transaction(
    steps.map((s) =>
      prisma.dayPlanStep.update({
        where: { id: s.id },
        data: { sortOrder: s.sortOrder },
      })
    )
  );

  return NextResponse.json({ success: true });
}
