import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app");
  }

  return (
    <main className="min-h-screen bg-[#0F172A] text-[#F8FAFC] selection:bg-[#86EFAC]/30 selection:text-[#86EFAC]">
      <nav className="fixed top-0 w-full z-50 border-b border-[#334155]/50 bg-[#0F172A]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <span className="text-[#F8FAFC] text-xl font-bold tracking-tighter">
              Fluye.
            </span>
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg bg-[#86EFAC]/10 text-[#86EFAC] border border-[#86EFAC]/20 hover:bg-[#86EFAC]/20 text-sm font-medium transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative min-h-screen flex flex-col items-center justify-start pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#86EFAC]/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 w-full max-w-5xl mx-auto text-center flex flex-col items-center mt-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#334155] bg-[#334155]/30 text-[#F8FAFC] text-sm font-medium mb-8 backdrop-blur-sm shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-[#86EFAC] animate-pulse" />
            Introducing Fluye for ADHD
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-[#F8FAFC] tracking-tight mb-6 leading-[1.1] max-w-4xl">
            Kill the Paralysis.{" "}
            <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#86EFAC] to-emerald-300">
              Slice the Task.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-[#F8FAFC]/70 max-w-2xl mb-10 leading-relaxed">
            Your ADHD doesn&apos;t need another &ldquo;planner.&rdquo; It needs
            a translator. We turn your vague, overwhelming
            &ldquo;to-dos&rdquo; into 5-minute wins—automatically.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mb-24">
            <Link
              href="/login"
              className="px-8 py-4 rounded-full bg-[#86EFAC] text-[#0F172A] font-bold text-lg hover:bg-emerald-400 transition-all duration-300 glow-green glow-green-hover hover:-translate-y-1"
            >
              Start for Free
            </Link>
            <button className="px-8 py-4 rounded-full border border-[#334155] text-[#F8FAFC] font-semibold text-lg hover:bg-[#334155]/50 transition-all duration-300 backdrop-blur-sm">
              See How It Works
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full border-t border-[#334155]/50 pt-16">
            <div className="flex flex-col items-center md:items-start text-center md:text-left group">
              <div className="h-12 w-12 rounded-xl bg-[#334155]/40 border border-[#334155] flex items-center justify-center text-[#86EFAC] mb-5 group-hover:bg-[#334155]/60 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-[#F8FAFC] font-bold text-lg mb-2">Vague to Vivid</h3>
              <p className="text-[#F8FAFC]/60 text-sm leading-relaxed">
                Transform &ldquo;Fix the project&rdquo; into a step-by-step roadmap.
              </p>
            </div>

            <div className="flex flex-col items-center md:items-start text-center md:text-left group">
              <div className="h-12 w-12 rounded-xl bg-[#334155]/40 border border-[#334155] flex items-center justify-center text-[#86EFAC] mb-5 group-hover:bg-[#334155]/60 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-[#F8FAFC] font-bold text-lg mb-2">Zero-Entry Friction</h3>
              <p className="text-[#F8FAFC]/60 text-sm leading-relaxed">
                Don&apos;t think about how to start. Just start.
              </p>
            </div>

            <div className="flex flex-col items-center md:items-start text-center md:text-left group">
              <div className="h-12 w-12 rounded-xl bg-[#334155]/40 border border-[#334155] flex items-center justify-center text-[#86EFAC] mb-5 group-hover:bg-[#334155]/60 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <h3 className="text-[#F8FAFC] font-bold text-lg mb-2">Cognitive Offloading</h3>
              <p className="text-[#F8FAFC]/60 text-sm leading-relaxed">
                Save your brainpower for the build, not the list.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
