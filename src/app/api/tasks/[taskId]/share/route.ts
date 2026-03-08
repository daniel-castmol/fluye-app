import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

/** POST /api/tasks/:taskId/share — Generate a share token for a task */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;

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

  // If already shared, return existing token
  if (task.shareToken) {
    return NextResponse.json({ shareToken: task.shareToken });
  }

  // Generate a URL-safe token (12 bytes = 16 chars base64url)
  const shareToken = randomBytes(12).toString("base64url");

  await prisma.task.update({
    where: { id: taskId },
    data: { shareToken, isShared: true },
  });

  return NextResponse.json({ shareToken });
}
