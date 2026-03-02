import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AppShell from "@/components/app/AppShell";

export default async function AppPage() {
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

  const tasks = await prisma.task.findMany({
    where: { profileId: profile.id, status: "active" },
    include: { steps: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell
      profile={JSON.parse(JSON.stringify(profile))}
      initialTasks={JSON.parse(JSON.stringify(tasks))}
    />
  );
}
