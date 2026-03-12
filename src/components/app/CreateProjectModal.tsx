"use client";

import { useState } from "react";
import type { Translations } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const EMOJI_OPTIONS = [
  "📁", "🚀", "💡", "🎯", "📊", "🔧", "📝", "🎨",
  "🧪", "📚", "💻", "🌱", "⚡", "🏗️", "🎓", "🔬",
  "📦", "🛠️", "🎵", "🏠",
];

const COLOR_OPTIONS = [
  "#86EFAC", "#93C5FD", "#FCA5A5", "#FCD34D",
  "#C4B5FD", "#F9A8D4", "#67E8F9", "#FDBA74",
];

interface CreateProjectModalProps {
  t: Translations;
  open: boolean;
  onClose: () => void;
  onCreated: (project: { id: string; name: string; emoji: string; color: string }) => void;
}

export default function CreateProjectModal({
  t,
  open,
  onClose,
  onCreated,
}: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📁");
  const [color, setColor] = useState("#86EFAC");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, emoji, color, description }),
      });

      if (!res.ok) return;

      const { project } = await res.json();
      onCreated(project);
      setName("");
      setEmoji("📁");
      setColor("#86EFAC");
      setDescription("");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#1E293B] border-[#334155] text-[#F8FAFC] max-w-md">
        <DialogHeader>
          <DialogTitle>{t.projectForm.createTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-[#94A3B8] text-xs">{t.projectForm.nameLabel}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.projectForm.namePlaceholder}
              className="mt-1 bg-[#0F172A] border-[#334155] text-[#F8FAFC] placeholder:text-[#475569]"
              maxLength={100}
              autoFocus
            />
          </div>

          <div>
            <Label className="text-[#94A3B8] text-xs">{t.projectForm.emojiLabel}</Label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all ${
                    emoji === e
                      ? "bg-[#334155] ring-2 ring-[#86EFAC] scale-110"
                      : "hover:bg-[#334155]/50"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-[#94A3B8] text-xs">{t.projectForm.colorLabel}</Label>
            <div className="mt-1 flex gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${
                    color === c ? "ring-2 ring-offset-2 ring-offset-[#1E293B] scale-110" : ""
                  }`}
                  style={{ backgroundColor: c, ["--tw-ring-color" as string]: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <Label className="text-[#94A3B8] text-xs">
              {t.projectForm.descriptionLabel}{" "}
              <span className="text-[#475569]">{t.projectForm.descriptionOptional}</span>
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.projectForm.descriptionPlaceholder}
              className="mt-1 bg-[#0F172A] border-[#334155] text-[#F8FAFC] placeholder:text-[#475569] resize-none"
              rows={2}
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155]/50"
            >
              {t.projectForm.cancel}
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || loading}
              className="bg-[#86EFAC] text-[#0F172A] hover:bg-[#86EFAC]/90 font-semibold"
            >
              {t.projectForm.create}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
