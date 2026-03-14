"use client";

import { useApp } from "@/components/app/AppContext";
import DayPlanner from "@/components/app/DayPlanner";

export default function PlannerPage() {
  const { t } = useApp();
  return <DayPlanner t={t} />;
}
