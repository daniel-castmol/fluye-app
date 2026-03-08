import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, roleWork, projects, preferredLanguage } = body;

  // At least one field must be present
  if (name !== undefined && (typeof name !== "string" || name.length === 0 || name.length > 100)) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  const lang =
    preferredLanguage === "es" ? "es" : preferredLanguage === "en" ? "en" : undefined;

  // Build update payload from provided fields only (partial update)
  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name.trim();
  if (roleWork !== undefined) data.roleWork = roleWork?.slice(0, 500) || null;
  if (projects !== undefined) data.projects = projects?.slice(0, 500) || null;
  if (lang !== undefined) data.preferredLanguage = lang;

  const profile = await prisma.userProfile.update({
    where: { userId: user.id },
    data,
  });

  return NextResponse.json({ profile });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, roleWork, projects, preferredLanguage } = body;

  if (!name || typeof name !== "string" || name.length > 100) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  // Validate language: only "en" or "es" accepted
  const lang =
    preferredLanguage === "es" ? "es" : "en";

  const profile = await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: {
      name,
      roleWork: roleWork?.slice(0, 500) || null,
      projects: projects?.slice(0, 500) || null,
      preferredLanguage: lang,
    },
    create: {
      userId: user.id,
      email: user.email!,
      name,
      roleWork: roleWork?.slice(0, 500) || null,
      projects: projects?.slice(0, 500) || null,
      preferredLanguage: lang,
    },
  });

  return NextResponse.json({ profile });
}

/** DELETE /api/profile — permanently delete account (profile + auth user) */
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Delete UserProfile (cascades to Tasks → TaskSteps via Prisma)
  await prisma.userProfile.delete({
    where: { userId: user.id },
  }).catch(() => {
    // Profile may not exist — that's fine, continue to delete auth user
  });

  // 2. Delete Supabase auth user via admin client
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete auth account" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
