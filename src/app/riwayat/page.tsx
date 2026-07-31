import Link from "next/link";
import {
  Signal,
  Globe,
  ArrowLeft,
  FileText,
  Calendar,
  Upload,
  ChevronRight,
} from "lucide-react";
import { getUploadsList, formatDateTime } from "@/lib/queries";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const NAVY = "#0a2a66";
const NAVY_DEEP = "#071c47";
const SKY = "#38bdf8";

export default async function RiwayatPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#f4f8fc" }}>
        <p className="text-slate-500">Supabase belum dikonfigurasi.</p>
      </div>
    );
  }

  let uploads: Awaited<ReturnType<typeof getUploadsList>>;
  try {
    uploads = await getUploadsList();
  } catch {
    uploads = [];
  }

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "#f4f8fc", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(180deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)` }}>
        <div className="mx-auto max-w-[800px] px-6 pb-8 pt-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.4)" }}
              >
                <Signal size={18} color={SKY} />
              </div>
              <div>
                <div className="font-display text-lg font-semibold leading-tight">AirNav Indonesia</div>
                <div className="text-[11px] leading-tight" style={{ color: "rgba(186,222,255,0.75)" }}>
                  Unit Surveillance · Jakarta Air Traffic Services Center
                </div>
              </div>
            </div>
            <div
              className="hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold sm:flex"
              style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              <Globe size={14} color={SKY} />
              FIR Jakarta
            </div>
          </div>

          <div className="mt-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors hover:bg-white/10"
              style={{ color: "rgba(186,222,255,0.85)", border: "1px solid rgba(186,222,255,0.2)" }}
            >
              <ArrowLeft size={12} />
              Kembali ke Dashboard
            </Link>
            <h1 className="font-display mt-4 text-2xl font-semibold leading-tight sm:text-3xl">
              Riwayat Upload
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed" style={{ color: "rgba(210,228,255,0.85)" }}>
              Semua sesi upload data CSV yang pernah dilakukan, diurutkan dari yang terbaru.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-[800px] px-6 -mt-4 pb-12">
        {uploads.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 shadow-sm text-center" style={{ border: "1px solid #e3ecf7" }}>
            <Upload size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-500 mb-4">Belum ada upload. Mulai dengan mengunggah file CSV pertama.</p>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: NAVY }}
            >
              <Upload size={16} />
              Upload CSV
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {uploads.map((u) => (
              <Link
                key={u.id}
                href={`/riwayat/${u.id}`}
                className="group flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm transition-all hover:shadow-md"
                style={{ border: "1px solid #e3ecf7" }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: "#f0f6ff" }}
                  >
                    <FileText size={18} style={{ color: NAVY }} />
                  </div>
                  <div>
                    <p className="font-mono-data text-sm font-semibold" style={{ color: NAVY }}>
                      {u.filename}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        Pengamatan: {formatDateTime(u.observed_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Upload size={11} />
                        Upload: {formatDateTime(u.uploaded_at)}
                      </span>
                      <span>{u.row_count} baris</span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={18} className="shrink-0 text-slate-300 transition-colors group-hover:text-slate-500" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
