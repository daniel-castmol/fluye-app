"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { UserProfile } from "@/types";
import { getTranslations, type Language } from "@/lib/i18n";
import { AppProvider } from "./AppContext";
import AppNavbar from "./AppNavbar";
import Sidebar from "./Sidebar";
import EditProfileModal from "./EditProfileModal";
import CreateProjectModal from "./CreateProjectModal";
import { invalidateChipsCache } from "./EmptyState";

interface AppShellLayoutProps {
  profile: UserProfile;
  initialProjects: { id: string; name: string; emoji: string; color: string }[];
  children: React.ReactNode;
}

export default function AppShellLayout({
  profile,
  initialProjects,
  children,
}: AppShellLayoutProps) {
  const router = useRouter();

  const [language, setLanguage] = useState<Language>(
    (profile.preferredLanguage as Language) || "en"
  );
  const t = getTranslations(language);

  const [profileName, setProfileName] = useState(profile.name);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [projects, setProjects] = useState(initialProjects);

  const [totalTasksCompleted] = useState(profile.totalTasksCompleted);
  const [currentStreak] = useState(profile.currentStreak);

  const handleLanguageChange = useCallback(async (lang: Language) => {
    setLanguage(lang);
    fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferredLanguage: lang }),
    }).catch(() => {});
  }, []);

  const handleProfileSaved = useCallback(
    ({ name, preferredLanguage }: { name: string; preferredLanguage: Language }) => {
      setProfileName(name);
      setLanguage(preferredLanguage);
      invalidateChipsCache();
    },
    []
  );

  const handleSignOut = useCallback(async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }, [router]);

  const handleProjectCreated = useCallback(
    (project: { id: string; name: string; emoji: string; color: string }) => {
      setProjects((prev) => [project, ...prev]);
      router.push(`/app/projects/${project.id}`);
    },
    [router]
  );

  const handleProjectsChange = useCallback(
    (newProjects: { id: string; name: string; emoji: string; color: string }[]) => {
      setProjects(newProjects);
    },
    []
  );

  const contextValue = useMemo(
    () => ({
      profile,
      profileName,
      language,
      t,
      onProjectsChange: handleProjectsChange,
    }),
    [profile, profileName, language, t, handleProjectsChange]
  );

  return (
    <AppProvider value={contextValue}>
      <div className="min-h-screen bg-[#0F172A]">
        <Sidebar
          t={t}
          projects={projects}
          onNewProject={() => setCreateProjectOpen(true)}
        />

        <div className="lg:pl-64 transition-all duration-200">
          <AppNavbar
            profileName={profileName}
            language={language}
            currentStreak={currentStreak}
            totalTasksCompleted={totalTasksCompleted}
            onLanguageChange={handleLanguageChange}
            onEditProfile={() => setEditProfileOpen(true)}
            onSignOut={handleSignOut}
          />

          <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-16">
            {children}
          </main>
        </div>

        <EditProfileModal
          t={t}
          profile={{ ...profile, name: profileName, preferredLanguage: language }}
          open={editProfileOpen}
          onClose={() => setEditProfileOpen(false)}
          onSaved={handleProfileSaved}
        />

        <CreateProjectModal
          t={t}
          open={createProjectOpen}
          onClose={() => setCreateProjectOpen(false)}
          onCreated={handleProjectCreated}
        />
      </div>
    </AppProvider>
  );
}
