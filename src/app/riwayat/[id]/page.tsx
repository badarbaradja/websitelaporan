import Link from "next/link";
import {
  Signal,
  Globe,
  ArrowLeft,
} from "lucide-react";
import UploadDetailClient from "@/components/UploadDetailClient";
import { getUploadById, getUploadReadings, formatDateTime } from "@/lib/queries";
import { isSupabaseConfigured } from "@/lib/supabase";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const NAVY = "#0a2a66";
const NAVY_DEEP = "#071c47";
const SKY = "#38bdf8";


type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function UploadDetailPage({ params }: PageProps) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#f4f8fc" }}>
        <p className="text-slate-500">Supabase belum dikonfigurasi.</p>
      </div>
    );
  }

  const { id } = await params;

  const upload = await getUploadById(id);
  if (!upload) {
    notFound();
  }

  let readings: Awaited<ReturnType<typeof getUploadReadings>>;
  try {
    readings = await getUploadReadings(id);
  } catch {
    readings = [];
  }

  const warnCount = readings.filter((r) => r.pa === 6).length;
  const criticalCount = readings.filter((r) => r.pa < 6).length;

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "#f4f8fc", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(180deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)` }}>
        <div className="mx-auto max-w-[1000px] px-6 pb-8 pt-6 text-white">
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
              href="/riwayat"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors hover:bg-white/10"
              style={{ color: "rgba(186,222,255,0.85)", border: "1px solid rgba(186,222,255,0.2)" }}
            >
              <ArrowLeft size={12} />
              Kembali ke Riwayat
            </Link>
            <h1 className="font-display mt-4 text-2xl font-semibold leading-tight sm:text-3xl">
              Detail Upload
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <UploadDetailClient 
        upload={upload} 
        readings={readings} 
        warnCount={warnCount} 
        criticalCount={criticalCount} 
      />
    </div>
  );
}
