import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
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

  // Get today's completed steps count
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const [projects, activeTaskCount, todayCompletedSteps, recentTasks] = await Promise.all([
    prisma.project.findMany({
      where: { profileId: profile.id, status: "active" },
      include: {
        _count: { select: { tasks: true } },
        tasks: {
          where: { status: "active" },
          select: {
            steps: {
              select: { completed: true },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.task.count({
      where: { profileId: profile.id, status: "active" },
    }),
    prisma.taskStep.count({
      where: {
        completed: true,
        completedAt: { gte: todayStart },
        task: { profileId: profile.id },
      },
    }),
    prisma.task.findMany({
      where: { profileId: profile.id },
      include: {
        steps: { orderBy: { order: "asc" } },
        project: { select: { id: true, name: true, emoji: true, color: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  // Compute progress per project
  const projectsWithProgress = projects.map((p) => {
    const allSteps = p.tasks.flatMap((t) => t.steps);
    const completed = allSteps.filter((s) => s.completed).length;
    const total = allSteps.length;
    return {
      id: p.id,
      name: p.name,
      emoji: p.emoji,
      color: p.color,
      description: p.description,
      status: p.status,
      taskCount: p._count.tasks,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  });

  return NextResponse.json({
    profile: {
      name: profile.name,
      currentStreak: profile.currentStreak,
      totalTasksCompleted: profile.totalTasksCompleted,
    },
    stats: {
      tasksToday: todayCompletedSteps,
      activeProjects: projects.length,
      activeTasks: activeTaskCount,
      streak: profile.currentStreak,
    },
    projects: projectsWithProgress,
    recentActivity: recentTasks,
  });
}
