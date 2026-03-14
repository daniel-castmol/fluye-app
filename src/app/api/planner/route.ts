import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Zod schema for PATCH body validation
const PlannerUpdateSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dailyWin: z.string().max(500).nullable().optional(),
  reflection: z.string().max(2000).nullable().optional(),
  mood: z.number().int().min(1).max(5).nullable().optional(),
});

/**
 * Helper: validate date string and return a Date object at midnight UTC.
 * Returns null if the string is not a valid YYYY-MM-DD date.
 */
function parseDateParam(dateStr: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const parsed = new Date(dateStr + "T00:00:00.000Z");
  if (isNaN(parsed.getTime())) return null;
  return parsed;
}

/**
 * GET /api/planner?date=YYYY-MM-DD
 *
 * Returns the DayPlan for the given date (or today if omitted).
 * Upserts the DayPlan so the client never has to call a separate "create" endpoint.
 */
export async function GET(request: NextRequest) {
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

  // --- Parse date query param (default to today UTC) ---
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");

  let date: Date;
  if (dateParam) {
    const parsed = parseDateParam(dateParam);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }
    date = parsed;
  } else {
    // Default to today at midnight UTC
    const now = new Date();
    date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
  }

  // --- Upsert DayPlan: get existing or create empty one ---
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
    include: {
      // Include assigned steps with full context (taskStep → task → project)
      steps: {
        orderBy: { sortOrder: "asc" },
        include: {
          taskStep: {
            include: {
              task: {
                include: {
                  project: {
                    select: {
                      id: true,
                      name: true,
                      emoji: true,
                      color: true,
                    },
                  },
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

/**
 * PATCH /api/planner
 *
 * Updates an existing DayPlan's dailyWin, reflection, or mood.
 * The DayPlan must already exist (created via GET upsert).
 */
export async function PATCH(request: NextRequest) {
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

  // --- Parse and validate request body with Zod ---
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = PlannerUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // --- Resolve the date (from body or default to today) ---
  const { date: dateStr, ...updateFields } = parsed.data;
  let date: Date;

  if (dateStr) {
    const parsedDate = parseDateParam(dateStr);
    if (!parsedDate) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }
    date = parsedDate;
  } else {
    const now = new Date();
    date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
  }

  // --- Find existing DayPlan (must exist — GET creates them) ---
  const existing = await prisma.dayPlan.findUnique({
    where: {
      profileId_date: {
        profileId: profile.id,
        date,
      },
    },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Day plan not found. Open the planner for this date first." },
      { status: 404 }
    );
  }

  // --- Update with validated fields ---
  const updated = await prisma.dayPlan.update({
    where: { id: existing.id },
    data: updateFields,
    include: {
      steps: {
        orderBy: { sortOrder: "asc" },
        include: {
          taskStep: {
            include: {
              task: {
                include: {
                  project: {
                    select: {
                      id: true,
                      name: true,
                      emoji: true,
                      color: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return NextResponse.json(updated);
}
