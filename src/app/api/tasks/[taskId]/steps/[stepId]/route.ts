import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string; stepId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId, stepId } = await params;
  const body = await request.json();
  const { completed } = body;

  if (typeof completed !== "boolean") {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const profile = await prisma.userProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 400 });
  }

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId: profile.id },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const step = await prisma.taskStep.update({
    where: { id: stepId, taskId: taskId },
    data: {
      completed,
      completedAt: completed ? new Date() : null,
    },
  });

  const allSteps = await prisma.taskStep.findMany({
    where: { taskId },
  });

  const allCompleted = allSteps.every((s) => s.completed);
  if (allCompleted) {
    await prisma.task.update({
      where: { id: taskId },
      data: { status: "completed", completedAt: new Date() },
    });
  } else {
    await prisma.task.update({
      where: { id: taskId },
      data: { status: "active", completedAt: null },
    });
  }

  return NextResponse.json({ step });
}
