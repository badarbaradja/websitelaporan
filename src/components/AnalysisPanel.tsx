"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, Wrench, Radio } from "lucide-react";
import type { AnalysisReading } from "@/lib/queries";
import Link from "next/link";
import { formatDateTime } from "@/lib/queries";

const NAVY = "#0a2a66";

const TONE = {
  good: { text: "#0f7a45", bg: "#e6f6ec", border: "#a9e2bf" },
  warn: { text: "#a15c00", bg: "#fff4e0", border: "#f3cc7d" },
  bad: { text: "#b91c1c", bg: "#fde9e9", border: "#f3aeae" },
};

function toneForPa(avg: number) {
  if (avg >= 7) return TONE.good;
  if (avg >= 6) return TONE.warn;
  return TONE.bad;
}

type AnalysisPanelProps = {
  data: AnalysisReading[];
};

/* ------------------------------------------------------------------
 * Panel A: Pesawat dengan indikasi masalah
 * ------------------------------------------------------------------ */

type AircraftInsight = {
  aircraft_address: string;
  callsign: string;
  registration: string;
  airline: string;
  avgPa: number;
  readingCount: number;
  trend: "up" | "down" | "stable";
  firstPa: number;
  lastPa: number;
};

function computeAircraftInsights(data: AnalysisReading[]): AircraftInsight[] {
  // Group readings by aircraft_address
  const groups = new Map<string, AnalysisReading[]>();
  for (const r of data) {
    const list = groups.get(r.aircraft_address) ?? [];
    list.push(r);
    groups.set(r.aircraft_address, list);
  }

  const insights: AircraftInsight[] = [];

  for (const [address, readings] of groups) {
    if (readings.length < 2) continue; // Skip aircraft with only 1 reading

    // Sort by recorded_at ascending
    readings.sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());

    const sum = readings.reduce((s, r) => s + r.pa, 0);
    const avg = sum / readings.length;
    const firstPa = readings[0].pa;
    const lastPa = readings[readings.length - 1].pa;

    let trend: "up" | "down" | "stable" = "stable";
    if (lastPa > firstPa) trend = "up";
    else if (lastPa < firstPa) trend = "down";

    const latest = readings[readings.length - 1];

    insights.push({
      aircraft_address: address,
      callsign: latest.callsign ?? address,
      registration: latest.registration ?? "—",
      airline: latest.airline ?? "—",
      avgPa: Math.round(avg * 10) / 10,
      readingCount: readings.length,
      trend,
      firstPa,
      lastPa,
    });
  }

  // Sort by avg PA ascending (worst first)
  insights.sort((a, b) => a.avgPa - b.avgPa);
  return insights;
}

/* ------------------------------------------------------------------
 * Panel B: Sesi pengamatan dengan indikasi gangguan ground station
 * ------------------------------------------------------------------ */

type UploadInsight = {
  upload_id: string;
  filename: string;
  observed_at: string;
  aircraftCount: number;
  avgPaSesi: number;
  affectedCount: number; // aircraft that dropped below their historical avg
};

function computeUploadInsights(data: AnalysisReading[]): UploadInsight[] {
  if (data.length === 0) return [];

  // 1. Compute historical average PA per aircraft (across ALL readings)
  const aircraftReadings = new Map<string, number[]>();
  for (const r of data) {
    const list = aircraftReadings.get(r.aircraft_address) ?? [];
    list.push(r.pa);
    aircraftReadings.set(r.aircraft_address, list);
  }

  const historicalAvg = new Map<string, number>();
  for (const [address, pas] of aircraftReadings) {
    historicalAvg.set(address, pas.reduce((s, v) => s + v, 0) / pas.length);
  }

  // 2. Group readings by upload_id
  const uploadGroups = new Map<string, AnalysisReading[]>();
  for (const r of data) {
    const list = uploadGroups.get(r.upload_id) ?? [];
    list.push(r);
    uploadGroups.set(r.upload_id, list);
  }

  // 3. For each upload, compute session avg and count affected aircraft
  const insights: UploadInsight[] = [];

  for (const [uploadId, readings] of uploadGroups) {
    const sum = readings.reduce((s, r) => s + r.pa, 0);
    const avgPaSesi = sum / readings.length;

    // Count aircraft whose PA in this session is below their historical avg
    const aircraftInSession = new Map<string, number[]>();
    for (const r of readings) {
      const list = aircraftInSession.get(r.aircraft_address) ?? [];
      list.push(r.pa);
      aircraftInSession.set(r.aircraft_address, list);
    }

    let affectedCount = 0;
    for (const [address, pas] of aircraftInSession) {
      const sessionAvg = pas.reduce((s, v) => s + v, 0) / pas.length;
      const histAvg = historicalAvg.get(address) ?? 7;
      // Consider "affected" if session PA is at least 1 below historical avg
      if (sessionAvg < histAvg - 0.5) {
        affectedCount++;
      }
    }

    const first = readings[0];
    insights.push({
      upload_id: uploadId,
      filename: first.upload_filename,
      observed_at: first.upload_observed_at,
      aircraftCount: aircraftInSession.size,
      avgPaSesi: Math.round(avgPaSesi * 10) / 10,
      affectedCount,
    });
  }

  // Only show uploads where multiple aircraft were affected (indication of ground station issue)
  // Sort by average PA ascending (worst sessions first)
  insights.sort((a, b) => a.avgPaSesi - b.avgPaSesi);

  // Filter: show sessions where affectedCount >= 2 OR avg is notably low
  return insights.filter((u) => u.affectedCount >= 2 || u.avgPaSesi < 6.5);
}

/* ------------------------------------------------------------------
 * Component
 * ------------------------------------------------------------------ */

export default function AnalysisPanel({ data }: AnalysisPanelProps) {
  const aircraftInsights = useMemo(() => computeAircraftInsights(data), [data]);
  const uploadInsights = useMemo(() => computeUploadInsights(data), [data]);

  if (aircraftInsights.length === 0 && uploadInsights.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Panel A — Aircraft issues */}
      <div className="rounded-2xl bg-white p-5 shadow-sm" style={{ border: "1px solid #e3ecf7" }}>
        <div className="mb-4 flex items-center gap-2">
          <Wrench size={16} style={{ color: NAVY }} />
          <div>
            <h3 className="font-display text-sm font-semibold" style={{ color: NAVY }}>
              Pesawat dengan Indikasi Masalah pada Perangkat
            </h3>
            <p className="text-xs text-slate-400">
              Ranking berdasarkan rata-rata PA historis (ascending) — minimal 2 pembacaan
            </p>
          </div>
        </div>

        {aircraftInsights.length === 0 ? (
          <p className="text-xs text-slate-400">Belum cukup data untuk analisis. Perlu minimal 2 reading per pesawat.</p>
        ) : (
          <div className="space-y-2">
            {aircraftInsights.map((a) => {
              const tone = toneForPa(a.avgPa);
              const TrendIcon = a.trend === "up" ? TrendingUp : a.trend === "down" ? TrendingDown : Minus;
              const trendColor = a.trend === "up" ? "#0f7a45" : a.trend === "down" ? "#b91c1c" : "#64748b";

              return (
                <div
                  key={a.aircraft_address}
                  className="flex items-center gap-3 rounded-xl p-3"
                  style={{ backgroundColor: "#f8fbff", border: "1px solid #eef3fa" }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono-data text-sm font-semibold" style={{ color: NAVY }}>
                        {a.callsign}
                      </span>
                      <span
                        className="font-mono-data rounded-md px-1.5 py-0.5 text-xs font-bold"
                        style={{ backgroundColor: tone.bg, color: tone.text, border: `1px solid ${tone.border}` }}
                      >
                        Avg {a.avgPa}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                      <span>{a.registration}</span>
                      <span>{a.airline}</span>
                      <span>{a.readingCount} readings</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 shrink-0">
                    <TrendIcon size={18} color={trendColor} />
                    <span className="font-mono-data text-[10px]" style={{ color: trendColor }}>
                      {a.firstPa}→{a.lastPa}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Panel B — Ground station issues */}
      <div className="rounded-2xl bg-white p-5 shadow-sm" style={{ border: "1px solid #e3ecf7" }}>
        <div className="mb-4 flex items-center gap-2">
          <Radio size={16} style={{ color: NAVY }} />
          <div>
            <h3 className="font-display text-sm font-semibold" style={{ color: NAVY }}>
              Sesi Pengamatan dengan Indikasi Gangguan Ground Station
            </h3>
            <p className="text-xs text-slate-400">
              Sesi di mana banyak pesawat turun bersamaan relatif terhadap riwayat masing-masing
            </p>
          </div>
        </div>

        {uploadInsights.length === 0 ? (
          <p className="text-xs text-slate-400">Tidak ada sesi pengamatan yang menunjukkan pola gangguan ground station.</p>
        ) : (
          <div className="space-y-2">
            {uploadInsights.map((u) => {
              const tone = toneForPa(u.avgPaSesi);

              return (
                <Link
                  href={`/riwayat/${u.upload_id}`}
                  key={u.upload_id}
                  className="block rounded-xl p-3 transition-shadow hover:shadow-md cursor-pointer"
                  style={{ backgroundColor: "#f8fbff", border: "1px solid #eef3fa" }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono-data text-sm font-semibold" style={{ color: NAVY }}>
                      {u.filename}
                    </span>
                    <span
                      className="font-mono-data rounded-md px-1.5 py-0.5 text-xs font-bold"
                      style={{ backgroundColor: tone.bg, color: tone.text, border: `1px solid ${tone.border}` }}
                    >
                      Avg {u.avgPaSesi}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                    <span>Pengamatan: {formatDateTime(u.observed_at)}</span>
                    <span>{u.aircraftCount} pesawat</span>
                    <span style={{ color: "#b91c1c", fontWeight: 600 }}>
                      {u.affectedCount} terdampak
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
