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
