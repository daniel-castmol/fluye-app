import Link from "next/link";

export default function SharedNotFound() {
  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#F8FAFC] mb-2">
          Task not found
        </h1>
        <p className="text-[#94A3B8] mb-6">
          This shared task doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/"
          className="inline-flex items-center px-5 py-2.5 rounded-full bg-[#86EFAC] text-[#0F172A] font-semibold text-sm hover:bg-[#86EFAC]/90 transition-colors"
        >
          Go to Fluye
        </Link>
      </div>
    </div>
  );
}
