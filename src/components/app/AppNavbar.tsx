"use client";

import { Button } from "@/components/ui/button";
import { LogOut, UserCog, Flame, Trophy } from "lucide-react";
import type { Language } from "@/lib/i18n";

interface AppNavbarProps {
  profileName: string;
  language: Language;
  currentStreak: number;
  totalTasksCompleted: number;
  onLanguageChange: (lang: Language) => void;
  onEditProfile: () => void;
  onSignOut: () => void;
}

export default function AppNavbar({
  profileName,
  language,
  currentStreak,
  totalTasksCompleted,
  onLanguageChange,
  onEditProfile,
  onSignOut,
}: AppNavbarProps) {
  return (
    <nav className="fixed top-0 w-full z-50 border-b border-[#334155]/50 bg-[#0F172A]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <span className="text-[#F8FAFC] text-xl font-bold tracking-tighter">
            Fluye.
          </span>
          
          <div className="flex items-center gap-4">
            {/* Progression Stats */}
            <div className="hidden sm:flex items-center gap-4 px-3 py-1.5 rounded-full border border-[#334155] bg-[#1E293B]/30">
              <div className="flex items-center gap-1.5" title="Daily Streak">
                <Flame className={`w-4 h-4 ${currentStreak > 0 ? "text-orange-500" : "text-[#94A3B8]"}`} />
                <span className="text-[#F8FAFC] text-xs font-bold">{currentStreak}</span>
              </div>
              <div className="w-px h-3 bg-[#334155]" />
              <div className="flex items-center gap-1.5" title="Total Tasks Crushed">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="text-[#F8FAFC] text-xs font-bold">{totalTasksCompleted}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Language toggle pill */}
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg border border-[#334155] bg-[#1E293B]/50">
                {(["en", "es"] as Language[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => onLanguageChange(lang)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide transition-all duration-150 ${
                      language === lang
                        ? "bg-[#334155] text-[#F8FAFC] shadow-sm"
                        : "text-[#94A3B8] hover:text-[#F8FAFC]"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>

              {/* Profile name + edit button */}
              <button
                type="button"
                onClick={onEditProfile}
                className="flex items-center gap-1.5 text-[#94A3B8] text-sm hover:text-[#F8FAFC] transition-colors duration-150"
              >
                <span className="hidden sm:inline">{profileName}</span>
                <UserCog className="w-3.5 h-3.5" />
              </button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onSignOut}
                className="text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155]/50"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
