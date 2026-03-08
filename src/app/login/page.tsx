"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const supabase = createClient();

  async function signInWithGoogle() {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  async function signInWithGitHub() {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  async function signInWithEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (!error) {
      setMagicLinkSent(true);
    }
  }

  return (
    <main className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#86EFAC]/8 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <Link
          href="/"
          className="block text-center text-2xl font-bold tracking-tighter text-[#F8FAFC] mb-2"
        >
          Fluye.
        </Link>
        <p className="text-center text-[#94A3B8] text-sm mb-8">
          Sign in to start breaking down your tasks
        </p>

        <div className="rounded-2xl border border-[#334155] bg-[#1E293B]/50 p-8 backdrop-blur-sm">
          {magicLinkSent ? (
            <div className="text-center py-4">
              <Mail className="w-10 h-10 text-[#86EFAC] mx-auto mb-4" />
              <h2 className="text-[#F8FAFC] font-semibold text-lg mb-2">Check your email</h2>
              <p className="text-[#94A3B8] text-sm mb-4">
                We sent a magic link to <span className="text-[#F8FAFC]">{email}</span>
              </p>
              <button
                type="button"
                onClick={() => { setMagicLinkSent(false); setEmail(""); }}
                className="text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              {/* Email magic link */}
              <form onSubmit={signInWithEmail} className="flex flex-col gap-3 mb-6">
                <Input
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-[#0F172A] border-[#334155] text-[#F8FAFC] placeholder:text-[#94A3B8]/50"
                />
                <Button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full h-12 bg-[#86EFAC] text-[#0F172A] font-semibold hover:bg-emerald-400 transition-all disabled:opacity-40"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Continue with Email
                </Button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-[#334155]" />
                <span className="text-xs text-[#94A3B8]">or</span>
                <div className="flex-1 h-px bg-[#334155]" />
              </div>

              {/* OAuth buttons */}
              <div className="flex flex-col gap-3">
                <Button
                  onClick={signInWithGoogle}
                  disabled={loading}
                  variant="outline"
                  className="w-full h-12 bg-[#0F172A] border-[#334155] text-[#F8FAFC] hover:bg-[#334155]/50 hover:text-[#F8FAFC] text-sm font-medium"
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </Button>

                <Button
                  onClick={signInWithGitHub}
                  disabled={loading}
                  variant="outline"
                  className="w-full h-12 bg-[#0F172A] border-[#334155] text-[#F8FAFC] hover:bg-[#334155]/50 hover:text-[#F8FAFC] text-sm font-medium"
                >
                  <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  Continue with GitHub
                </Button>
              </div>
            </>
          )}

          <div className="mt-6 text-center">
            <p className="text-xs text-[#94A3B8]">
              By signing in, you agree to our Terms of Service
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
