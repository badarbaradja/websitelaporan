import { getTargets } from "@/lib/queries";
import { isSupabaseConfigured } from "@/lib/supabase";
import DashboardClient from "@/components/DashboardClient";

export const dynamic = "force-dynamic"; // Always fetch fresh data on each request

function SetupMessage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8" style={{ backgroundColor: "#f4f8fc" }}>
      <div className="max-w-md rounded-2xl bg-white p-8 shadow-sm text-center" style={{ border: "1px solid #e3ecf7" }}>
        <h1 className="font-display text-xl font-semibold mb-4" style={{ color: "#0a2a66" }}>
          ⚙️ Setup Diperlukan
        </h1>
        <p className="text-sm text-slate-600 mb-4">
          Dashboard belum bisa terhubung ke Supabase. Pastikan kamu sudah:
        </p>
        <ol className="text-left text-sm text-slate-600 space-y-2 mb-6">
          <li className="flex gap-2">
            <span className="font-mono-data text-xs font-semibold text-slate-400">1.</span>
            Copy <code className="font-mono-data text-xs bg-slate-100 px-1 py-0.5 rounded">.env.local.example</code> menjadi{" "}
            <code className="font-mono-data text-xs bg-slate-100 px-1 py-0.5 rounded">.env.local</code>
          </li>
          <li className="flex gap-2">
            <span className="font-mono-data text-xs font-semibold text-slate-400">2.</span>
            Isi <code className="font-mono-data text-xs bg-slate-100 px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
            <code className="font-mono-data text-xs bg-slate-100 px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
          </li>
          <li className="flex gap-2">
            <span className="font-mono-data text-xs font-semibold text-slate-400">3.</span>
            Jalankan migration SQL di Supabase SQL Editor
          </li>
          <li className="flex gap-2">
            <span className="font-mono-data text-xs font-semibold text-slate-400">4.</span>
            Jalankan seed SQL untuk data awal
          </li>
          <li className="flex gap-2">
            <span className="font-mono-data text-xs font-semibold text-slate-400">5.</span>
            Restart dev server: <code className="font-mono-data text-xs bg-slate-100 px-1 py-0.5 rounded">npm run dev</code>
          </li>
        </ol>
        <p className="text-xs text-slate-400">
          Lihat <code className="font-mono-data">README.md</code> untuk detail lengkap.
        </p>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return <SetupMessage />;
  }

  let initialTargets;
  try {
    initialTargets = await getTargets();
  } catch {
    // If Supabase query fails, also show setup message
    return <SetupMessage />;
  }

  return <DashboardClient initialTargets={initialTargets} />;
}
