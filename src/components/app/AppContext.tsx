"use client";

import { createContext, useContext } from "react";
import type { UserProfile } from "@/types";
import type { Language, Translations } from "@/lib/i18n";

interface AppContextValue {
  profile: UserProfile;
  profileName: string;
  language: Language;
  t: Translations;
  onProjectsChange: (projects: { id: string; name: string; emoji: string; color: string }[]) => void;
  onActiveTimerChange?: (active: boolean) => void; // Report timer state to sidebar
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: AppContextValue;
}) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
