import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AppShellLayout from "@/components/app/AppShellLayout";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await prisma.userProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    redirect("/profile-setup");
  }

  const projects = await prisma.project.findMany({
    where: { profileId: profile.id, status: "active" },
    select: { id: true, name: true, emoji: true, color: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <AppShellLayout
      profile={JSON.parse(JSON.stringify(profile))}
      initialProjects={JSON.parse(JSON.stringify(projects))}
    >
      {children}
    </AppShellLayout>
  );
}
