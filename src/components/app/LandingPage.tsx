"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getTranslations, type Language } from "@/lib/i18n";

export default function LandingPage() {
  // Persist landing-page language preference in localStorage
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("fluye_landing_lang") as Language | null;
      if (saved === "en" || saved === "es") setLanguage(saved);
    } catch {
      // ignore — localStorage may be unavailable
    }
  }, []);

  function handleLanguageChange(lang: Language) {
    setLanguage(lang);
    try {
      localStorage.setItem("fluye_landing_lang", lang);
    } catch {
      // ignore storage errors
    }
  }

  const t = getTranslations(language);

  return (
    <main className="min-h-screen bg-[#0F172A] text-[#F8FAFC] selection:bg-[#86EFAC]/30 selection:text-[#86EFAC]">
      <nav className="fixed top-0 w-full z-50 border-b border-[#334155]/50 bg-[#0F172A]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <span className="text-[#F8FAFC] text-xl font-bold tracking-tighter">
              Fluye.
            </span>
            <div className="flex items-center gap-3">
              {/* Language toggle pill */}
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg border border-[#334155] bg-[#1E293B]/50">
                {(["en", "es"] as Language[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => handleLanguageChange(lang)}
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

              <Link
                href="/login"
                className="px-4 py-2 rounded-lg bg-[#86EFAC]/10 text-[#86EFAC] border border-[#86EFAC]/20 hover:bg-[#86EFAC]/20 text-sm font-medium transition-colors"
              >
                {t.landing.signIn}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="relative min-h-screen flex flex-col items-center justify-start pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#86EFAC]/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 w-full max-w-5xl mx-auto text-center flex flex-col items-center mt-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#334155] bg-[#334155]/30 text-[#F8FAFC] text-sm font-medium mb-8 backdrop-blur-sm shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-[#86EFAC] animate-pulse" />
            {t.landing.badge}
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-[#F8FAFC] tracking-tight mb-6 leading-[1.1] max-w-4xl">
            {t.landing.headline1}{" "}
            <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#86EFAC] to-emerald-300">
              {t.landing.headline2}
            </span>
          </h1>

          <p className="text-lg md:text-xl text-[#F8FAFC]/70 max-w-2xl mb-10 leading-relaxed">
            {t.landing.subtitle}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mb-24">
            <Link
              href="/login"
              className="px-8 py-4 rounded-full bg-[#86EFAC] text-[#0F172A] font-bold text-lg hover:bg-emerald-400 transition-all duration-300 glow-green glow-green-hover hover:-translate-y-1"
            >
              {t.landing.ctaPrimary}
            </Link>
            <button
              type="button"
              className="px-8 py-4 rounded-full border border-[#334155] text-[#F8FAFC] font-semibold text-lg hover:bg-[#334155]/50 transition-all duration-300 backdrop-blur-sm"
            >
              {t.landing.ctaSecondary}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full border-t border-[#334155]/50 pt-16">
            <div className="flex flex-col items-center md:items-start text-center md:text-left group">
              <div className="h-12 w-12 rounded-xl bg-[#334155]/40 border border-[#334155] flex items-center justify-center text-[#86EFAC] mb-5 group-hover:bg-[#334155]/60 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-[#F8FAFC] font-bold text-lg mb-2">{t.landing.feature1Title}</h3>
              <p className="text-[#F8FAFC]/60 text-sm leading-relaxed">{t.landing.feature1Desc}</p>
            </div>

            <div className="flex flex-col items-center md:items-start text-center md:text-left group">
              <div className="h-12 w-12 rounded-xl bg-[#334155]/40 border border-[#334155] flex items-center justify-center text-[#86EFAC] mb-5 group-hover:bg-[#334155]/60 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-[#F8FAFC] font-bold text-lg mb-2">{t.landing.feature2Title}</h3>
              <p className="text-[#F8FAFC]/60 text-sm leading-relaxed">{t.landing.feature2Desc}</p>
            </div>

            <div className="flex flex-col items-center md:items-start text-center md:text-left group">
              <div className="h-12 w-12 rounded-xl bg-[#334155]/40 border border-[#334155] flex items-center justify-center text-[#86EFAC] mb-5 group-hover:bg-[#334155]/60 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <h3 className="text-[#F8FAFC] font-bold text-lg mb-2">{t.landing.feature3Title}</h3>
              <p className="text-[#F8FAFC]/60 text-sm leading-relaxed">{t.landing.feature3Desc}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
