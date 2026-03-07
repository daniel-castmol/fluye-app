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
    where: { id: taskId, profileId: profile.id },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const step = await prisma.taskStep.update({
    where: { id: stepId },
    data: {
      completed,
      completedAt: completed ? new Date() : null,
    },
  });

  const allSteps = await prisma.taskStep.findMany({
    where: { taskId },
  });

  const allCompleted = allSteps.every((s) => s.completed);
  const wasAlreadyCompleted = task.status === "completed";

  if (allCompleted) {
    await prisma.task.update({
      where: { id: taskId },
      data: { status: "completed", completedAt: new Date() },
    });

    // Update profile stats if this task just became completed for the first time
    if (!wasAlreadyCompleted) {
      const now = new Date();
      let newStreak = profile.currentStreak;
      
      if (!profile.lastCompletionDate) {
        newStreak = 1;
      } else {
        const lastDate = new Date(profile.lastCompletionDate);
        const diffInDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Use UTC date strings to compare "days"
        const isToday = now.toISOString().split("T")[0] === lastDate.toISOString().split("T")[0];
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const isYesterday = yesterday.toISOString().split("T")[0] === lastDate.toISOString().split("T")[0];

        if (isYesterday) {
          newStreak += 1;
        } else if (!isToday) {
          // Lapsed streak
          newStreak = 1;
        }
        // If isToday, streak stays the same
      }

      const updatedProfile = await prisma.userProfile.update({
        where: { id: profile.id },
        data: {
          totalTasksCompleted: { increment: 1 },
          currentStreak: newStreak,
          lastCompletionDate: now,
        },
      });

      return NextResponse.json({ 
        step, 
        profileStats: {
          totalTasksCompleted: updatedProfile.totalTasksCompleted,
          currentStreak: updatedProfile.currentStreak,
        }
      });
    }
  } else {
    await prisma.task.update({
      where: { id: taskId },
      data: { status: "active", completedAt: null },
    });
  }

  return NextResponse.json({ step });
}
