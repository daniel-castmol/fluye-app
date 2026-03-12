import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
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
    return NextResponse.json({ tasks: [] });
  }

  // Support ?status=archived|completed to fetch non-active tasks
  // Support ?projectId= to filter by project
  const { searchParams } = new URL(request.url);
  const rawStatus = searchParams.get("status");
  const status =
    rawStatus === "archived" ? "archived" : rawStatus === "completed" ? "completed" : "active";
  const projectId = searchParams.get("projectId");

  const where: Record<string, unknown> = { profileId: profile.id, status };
  if (projectId === "unassigned") {
    where.projectId = null;
  } else if (projectId) {
    where.projectId = projectId;
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      steps: { orderBy: { order: "asc" } },
      project: { select: { id: true, name: true, emoji: true, color: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ tasks });
}

export async function DELETE() {
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

  await prisma.task.updateMany({
    where: { profileId: profile.id, status: "active" },
    data: { status: "archived" },
  });

  return NextResponse.json({ success: true });
}
