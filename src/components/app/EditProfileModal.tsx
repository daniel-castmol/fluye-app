"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { UserProfile } from "@/types";
import type { Language, Translations } from "@/lib/i18n";

interface EditProfileModalProps {
  t: Translations;
  profile: UserProfile;
  open: boolean;
  onClose: () => void;
  /** Called after a successful save with the updated profile fields */
  onSaved: (updates: { name: string; preferredLanguage: Language }) => void;
}

export default function EditProfileModal({
  t,
  profile,
  open,
  onClose,
  onSaved,
}: EditProfileModalProps) {
  const [name, setName] = useState(profile.name);
  const [roleWork, setRoleWork] = useState(profile.roleWork ?? "");
  const [projects, setProjects] = useState(profile.projects ?? "");
  const [language, setLanguage] = useState<Language>(
    (profile.preferredLanguage as Language) || "en"
  );
  const [loading, setLoading] = useState(false);

  // Sync form when profile prop changes (e.g. after external language switch)
  useEffect(() => {
    setName(profile.name);
    setRoleWork(profile.roleWork ?? "");
    setProjects(profile.projects ?? "");
    setLanguage((profile.preferredLanguage as Language) || "en");
  }, [profile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          roleWork,
          projects,
          preferredLanguage: language,
        }),
      });

      if (!res.ok) {
        toast.error(t.editProfile.errorToast);
        return;
      }

      toast.success(t.editProfile.savedToast);
      onSaved({ name: name.trim(), preferredLanguage: language });
      onClose();
    } catch {
      toast.error(t.editProfile.errorToast);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-[#1E293B] border-[#334155] text-[#F8FAFC] max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#F8FAFC] text-lg font-bold">
            {t.editProfile.title}
          </DialogTitle>
          <DialogDescription className="text-[#94A3B8] text-sm">
            {t.editProfile.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="ep-name" className="text-[#F8FAFC] text-sm">
              {t.editProfile.nameLabel}
            </Label>
            <Input
              id="ep-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.editProfile.namePlaceholder}
              required
              maxLength={100}
              className="bg-[#0F172A] border-[#334155] text-[#F8FAFC] placeholder:text-[#94A3B8]/50"
            />
          </div>

          {/* Role / Work */}
          <div className="space-y-1.5">
            <Label htmlFor="ep-role" className="text-[#F8FAFC] text-sm">
              {t.editProfile.roleLabel}
            </Label>
            <Textarea
              id="ep-role"
              value={roleWork}
              onChange={(e) => setRoleWork(e.target.value)}
              placeholder={t.editProfile.rolePlaceholder}
              rows={3}
              maxLength={500}
              className="bg-[#0F172A] border-[#334155] text-[#F8FAFC] placeholder:text-[#94A3B8]/50 resize-none"
            />
          </div>

          {/* Current Projects */}
          <div className="space-y-1.5">
            <Label htmlFor="ep-projects" className="text-[#F8FAFC] text-sm">
              {t.editProfile.projectsLabel}{" "}
              <span className="text-[#94A3B8] text-xs">{t.editProfile.projectsOptional}</span>
            </Label>
            <Textarea
              id="ep-projects"
              value={projects}
              onChange={(e) => setProjects(e.target.value)}
              placeholder={t.editProfile.projectsPlaceholder}
              rows={3}
              maxLength={500}
              className="bg-[#0F172A] border-[#334155] text-[#F8FAFC] placeholder:text-[#94A3B8]/50 resize-none"
            />
          </div>

          {/* Language preference */}
          <div className="space-y-1.5">
            <Label className="text-[#F8FAFC] text-sm">
              {t.editProfile.languageLabel}
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {(["en", "es"] as Language[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={`flex items-center justify-center gap-2 h-10 rounded-xl border text-sm font-medium transition-all duration-200 ${
                    language === lang
                      ? "border-[#86EFAC]/60 bg-[#86EFAC]/10 text-[#86EFAC]"
                      : "border-[#334155] text-[#94A3B8] hover:border-[#334155]/80 hover:text-[#F8FAFC]"
                  }`}
                >
                  {lang === "en" ? "🇺🇸 English" : "🇨🇱 Español"}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="flex-1 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155]/50"
            >
              {t.editProfile.cancel}
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 bg-[#86EFAC] text-[#0F172A] font-bold hover:bg-emerald-400 transition-all duration-300 disabled:opacity-40"
            >
              {loading ? t.editProfile.saving : t.editProfile.saveButton}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
