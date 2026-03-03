"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function ProfileSetupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [roleWork, setRoleWork] = useState("");
  const [projects, setProjects] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState<"en" | "es">("en");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), roleWork, projects, preferredLanguage }),
      });

      if (res.ok) {
        router.push("/app");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#86EFAC]/8 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg">
        <h1 className="text-2xl font-bold text-[#F8FAFC] text-center mb-2">
          Tell me a bit about yourself
        </h1>
        <p className="text-[#94A3B8] text-sm text-center mb-8">
          This helps me understand your tasks and give better breakdowns
        </p>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[#334155] bg-[#1E293B]/50 p-8 backdrop-blur-sm space-y-6"
        >
          <div className="space-y-2">
            <Label htmlFor="name" className="text-[#F8FAFC]">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Daniel"
              required
              className="bg-[#0F172A] border-[#334155] text-[#F8FAFC] placeholder:text-[#94A3B8]/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="roleWork" className="text-[#F8FAFC]">
              Role / Work
            </Label>
            <Textarea
              id="roleWork"
              value={roleWork}
              onChange={(e) => setRoleWork(e.target.value)}
              placeholder="Data Engineer at Techspert. Working with AWS, Python, SQL..."
              rows={3}
              className="bg-[#0F172A] border-[#334155] text-[#F8FAFC] placeholder:text-[#94A3B8]/50 resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="projects" className="text-[#F8FAFC]">
              Current Projects{" "}
              <span className="text-[#94A3B8] text-xs">(optional)</span>
            </Label>
            <Textarea
              id="projects"
              value={projects}
              onChange={(e) => setProjects(e.target.value)}
              placeholder="Expert sourcing analytics app, Medallion architecture setup..."
              rows={3}
              className="bg-[#0F172A] border-[#334155] text-[#F8FAFC] placeholder:text-[#94A3B8]/50 resize-none"
            />
          </div>

          {/* Language preference selector */}
          <div className="space-y-2">
            <Label className="text-[#F8FAFC]">Preferred Language</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPreferredLanguage("en")}
                className={`flex items-center justify-center gap-2 h-11 rounded-xl border text-sm font-medium transition-all duration-200 ${
                  preferredLanguage === "en"
                    ? "border-[#86EFAC]/60 bg-[#86EFAC]/10 text-[#86EFAC]"
                    : "border-[#334155] text-[#94A3B8] hover:border-[#334155]/80 hover:text-[#F8FAFC]"
                }`}
              >
                🇺🇸 English
              </button>
              <button
                type="button"
                onClick={() => setPreferredLanguage("es")}
                className={`flex items-center justify-center gap-2 h-11 rounded-xl border text-sm font-medium transition-all duration-200 ${
                  preferredLanguage === "es"
                    ? "border-[#86EFAC]/60 bg-[#86EFAC]/10 text-[#86EFAC]"
                    : "border-[#334155] text-[#94A3B8] hover:border-[#334155]/80 hover:text-[#F8FAFC]"
                }`}
              >
                🇨🇱 Español
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full h-12 bg-[#86EFAC] text-[#0F172A] font-bold hover:bg-emerald-400 transition-all duration-300"
          >
            {loading ? "Setting up..." : "Continue →"}
          </Button>
        </form>
      </div>
    </main>
  );
}
