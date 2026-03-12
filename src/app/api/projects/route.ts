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
    return NextResponse.json({ projects: [] });
  }

  const projects = await prisma.project.findMany({
    where: { profileId: profile.id, status: "active" },
    include: {
      _count: { select: { tasks: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
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
    return NextResponse.json(
      { error: "Profile not found" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { name, emoji, color, description } = body;

  if (!name || typeof name !== "string" || name.length > 100) {
    return NextResponse.json({ error: "Invalid project name" }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      profileId: profile.id,
      name: name.trim(),
      emoji: emoji || "📁",
      color: color || "#86EFAC",
      description: description?.trim() || null,
    },
    include: {
      _count: { select: { tasks: true } },
    },
  });

  return NextResponse.json({ project }, { status: 201 });
}
