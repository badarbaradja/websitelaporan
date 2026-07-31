"use client";

import { useState } from "react";
import { Calendar, Upload, FileText, AlertTriangle, Filter } from "lucide-react";
import { formatDateTime } from "@/lib/queries";

import type { UploadRow, UploadDetailRow } from "@/lib/queries";

const NAVY = "#0a2a66";

const TONE = {
  good: { text: "#0f7a45", bg: "#e6f6ec", border: "#a9e2bf", dot: "#22c55e" },
  warn: { text: "#a15c00", bg: "#fff4e0", border: "#f3cc7d", dot: "#f59e0b" },
  bad: { text: "#b91c1c", bg: "#fde9e9", border: "#f3aeae", dot: "#ef4444" },
};

function statusOf(pa: number) {
  if (pa >= 7) return { label: pa >= 9 ? "Sangat Baik" : pa === 8 ? "Baik" : "Cukup Baik", tone: "good" as const };
  if (pa === 6) return { label: "Perlu Perhatian", tone: "warn" as const };
  return { label: "Menurun", tone: "bad" as const };
}

type UploadDetailClientProps = {
  upload: UploadRow;
  readings: UploadDetailRow[];
  warnCount: number;
  criticalCount: number;
};

export default function UploadDetailClient({ upload, readings, warnCount, criticalCount }: UploadDetailClientProps) {
  // Default to true if there are any warnings/criticals, so user only sees the affected ones by default
  const [showOnlyAffected, setShowOnlyAffected] = useState(warnCount > 0 || criticalCount > 0);

  const displayedReadings = showOnlyAffected
    ? readings.filter((r) => r.pa <= 6)
    : readings;

  return (
    <div className="mx-auto max-w-[1000px] px-6 -mt-4 pb-12">
      {/* Upload Info Card */}
      <div className="rounded-2xl bg-white p-5 shadow-sm mb-4" style={{ border: "1px solid #e3ecf7" }}>
        <div className="flex items-start gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: "#f0f6ff" }}
          >
            <FileText size={20} style={{ color: NAVY }} />
          </div>
          <div className="flex-1">
            <p className="font-mono-data text-base font-semibold" style={{ color: NAVY }}>
              {upload.filename}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <Calendar size={13} />
                Pengamatan: {formatDateTime(upload.observed_at)}
              </span>
              <span className="flex items-center gap-1.5">
                <Upload size={13} />
                Upload: {formatDateTime(upload.uploaded_at)}
              </span>
              <span>{upload.row_count} baris total</span>
            </div>
            {(warnCount > 0 || criticalCount > 0) && (
              <div className="mt-2 flex gap-3 text-xs">
                {warnCount > 0 && (
                  <span className="flex items-center gap-1 font-semibold" style={{ color: TONE.warn.text }}>
                    <AlertTriangle size={12} /> {warnCount} perlu perhatian
                  </span>
                )}
                {criticalCount > 0 && (
                  <span className="flex items-center gap-1 font-semibold" style={{ color: TONE.bad.text }}>
                    <AlertTriangle size={12} /> {criticalCount} kualitas menurun
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Readings Table */}
      <div className="rounded-2xl bg-white shadow-sm" style={{ border: "1px solid #e3ecf7" }}>
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "#e3ecf7" }}>
          <div>
            <h2 className="font-display text-sm font-semibold" style={{ color: NAVY }}>
              Data Pembacaan PA
            </h2>
            <span className="text-xs text-slate-400">
              Menampilkan {displayedReadings.length} baris
            </span>
          </div>
          
          {(warnCount > 0 || criticalCount > 0) && (
            <button
              onClick={() => setShowOnlyAffected(!showOnlyAffected)}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{ 
                backgroundColor: showOnlyAffected ? "#fef2f2" : "#f8fbff", 
                color: showOnlyAffected ? "#b91c1c" : NAVY,
                border: `1px solid ${showOnlyAffected ? "#f3aeae" : "#eef3fa"}`
              }}
            >
              <Filter size={14} />
              {showOnlyAffected ? "Hanya Tampilkan PA ≤ 6" : "Tampilkan Semua"}
            </button>
          )}
        </div>
        
        {displayedReadings.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Tidak ada data pesawat yang kualitasnya menurun pada sesi ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-2 font-medium">Callsign</th>
                  <th className="px-5 py-2 font-medium">Address</th>
                  <th className="px-5 py-2 font-medium">Registrasi</th>
                  <th className="px-5 py-2 font-medium">Airline</th>
                  <th className="px-5 py-2 font-medium">PA</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 font-medium">Level</th>
                </tr>
              </thead>
              <tbody>
                {displayedReadings.map((r) => {
                  const st = statusOf(r.pa);
                  const t = TONE[st.tone];
                  return (
                    <tr
                      key={r.id}
                      className="airnav-row border-t"
                      style={{ borderColor: "#eef3fa" }}
                    >
                      <td className="font-mono-data px-5 py-3 font-semibold" style={{ color: NAVY }}>
                        {r.callsign || "—"}
                      </td>
                      <td className="font-mono-data px-5 py-3 text-xs text-slate-600">
                        {r.aircraft_address}
                      </td>
                      <td className="px-5 py-3 text-slate-600">{r.registration || "—"}</td>
                      <td className="px-5 py-3 text-slate-600">{r.airline || "—"}</td>
                      <td className="font-mono-data px-5 py-3 font-semibold">{r.pa}</td>
                      <td className="px-5 py-3">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                          style={{ color: t.text, backgroundColor: t.bg, border: `1px solid ${t.border}` }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: t.dot }} />
                          {st.label}
                        </span>
                      </td>
                      <td className="font-mono-data px-5 py-3 text-slate-600">{r.level ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
