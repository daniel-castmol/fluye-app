"use client";

import { useApp } from "@/components/app/AppContext";
import Dashboard from "@/components/app/Dashboard";

export default function DashboardPage() {
  const { t, profileName, onProjectsChange } = useApp();

  return (
    <Dashboard
      t={t}
      profileName={profileName}
      onProjectsChange={onProjectsChange}
    />
  );
}
