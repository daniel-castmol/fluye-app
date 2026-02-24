"use client";

import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface AppNavbarProps {
  profileName: string;
  onSignOut: () => void;
}

export default function AppNavbar({ profileName, onSignOut }: AppNavbarProps) {
  return (
    <nav className="fixed top-0 w-full z-50 border-b border-[#334155]/50 bg-[#0F172A]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <span className="text-[#F8FAFC] text-xl font-bold tracking-tighter">
            Fluye.
          </span>
          <div className="flex items-center gap-4">
            <span className="text-[#94A3B8] text-sm hidden sm:inline">
              {profileName}
            </span>
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
    </nav>
  );
}
