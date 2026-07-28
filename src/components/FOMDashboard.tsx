"use client";

import { useState, useMemo, Fragment } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Plane,
  Satellite,
  Signal,
  AlertTriangle,
  AlertOctagon,
  Activity,
  Gauge,
  Info,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Globe,
  Wifi,
  WifiOff,
  PlusCircle,
} from "lucide-react";
import Link from "next/link";
import type { TargetWithPa } from "@/lib/queries";

/* ------------------------------------------------------------------
 * Shared constants & helpers  (unchanged from prototype)
 * ------------------------------------------------------------------ */

const PA_LEGEND = [
  { pa: "9", label: "Sangat baik", tone: "good" as const },
  { pa: "8", label: "Baik", tone: "good" as const },
  { pa: "7", label: "Cukup baik", tone: "good" as const },
  { pa: "6", label: "Mulai menurun, perlu perhatian", tone: "warn" as const },
  { pa: "< 6", label: "Menurun, risiko intermittent target", tone: "bad" as const },
];

function statusOf(pa: number) {
  if (pa >= 7) return { label: pa >= 9 ? "Sangat Baik" : pa === 8 ? "Baik" : "Cukup Baik", tone: "good" as const };
  if (pa === 6) return { label: "Perlu Perhatian", tone: "warn" as const };
  return { label: "Menurun", tone: "bad" as const };
}

const TONE = {
  good: { text: "#0f7a45", bg: "#e6f6ec", border: "#a9e2bf", dot: "#22c55e" },
  warn: { text: "#a15c00", bg: "#fff4e0", border: "#f3cc7d", dot: "#f59e0b" },
  bad: { text: "#b91c1c", bg: "#fde9e9", border: "#f3aeae", dot: "#ef4444" },
};

const NAVY = "#0a2a66";
const NAVY_DEEP = "#071c47";
const SKY = "#38bdf8";

/* ------------------------------------------------------------------
 * Sub-components  (unchanged from prototype)
 * ------------------------------------------------------------------ */

function Badge({ tone, children }: { tone: "good" | "warn" | "bad"; children: React.ReactNode }) {
  const t = TONE[tone];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ color: t.text, backgroundColor: t.bg, border: `1px solid ${t.border}` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: t.dot }} />
      {children}
    </span>
  );
}

function RadarSweep({ targets }: { targets: TargetWithPa[] }) {
  const blips = useMemo(
    () =>
      targets.slice(0, 8).map((t, i) => {
        const angle = (i / targets.length) * 360 + (i % 2 === 0 ? 10 : -15);
        const radius = 28 + ((i * 37) % 58);
        const rad = (angle * Math.PI) / 180;
        const x = 50 + radius * Math.cos(rad) * 0.45;
        const y = 50 + radius * Math.sin(rad) * 0.45;
        return { ...t, x, y };
      }),
    [targets]
  );

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[280px]">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${NAVY_DEEP} 0%, #05122e 100%)`,
          border: "1px solid rgba(56,189,248,0.35)",
          boxShadow: "0 0 40px rgba(56,189,248,0.15) inset",
        }}
      />
      {[82, 60, 38, 16].map((size) => (
        <div
          key={size}
          className="absolute rounded-full"
          style={{
            width: `${size}%`,
            height: `${size}%`,
            top: `${(100 - size) / 2}%`,
            left: `${(100 - size) / 2}%`,
            border: "1px solid rgba(148,197,255,0.18)",
          }}
        />
      ))}
      <div className="absolute inset-0" style={{ borderRadius: "9999px", overflow: "hidden" }}>
        <div
          className="airnav-sweep absolute inset-0"
          style={{
            background: `conic-gradient(from 0deg, rgba(56,189,248,0.55), rgba(56,189,248,0) 32%)`,
          }}
        />
      </div>
      {blips.map((b) => {
        const s = statusOf(b.pa);
        const t = TONE[s.tone];
        return (
          <div
            key={b.id}
            className="airnav-blip absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: `${b.x}%`, top: `${b.y}%`, backgroundColor: t.dot, boxShadow: `0 0 8px ${t.dot}` }}
            title={`${b.id} · PA ${b.pa}`}
          />
        );
      })}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-mono-data text-[10px] tracking-[0.2em]" style={{ color: "rgba(186,222,255,0.75)" }}>
          ADS-B · CAT21 ED. 0.26
        </span>
        <span className="mt-1 font-display text-2xl font-semibold text-white">JATSC</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
 * Main dashboard component
 * ------------------------------------------------------------------ */

type FOMDashboardProps = {
  targets: TargetWithPa[];
  isConnected: boolean;
};

export default function FOMDashboard({ targets, isConnected }: FOMDashboardProps) {
  const [selectedId, setSelectedId] = useState("CPA332");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const selected = targets.find((t) => t.id === selectedId) ?? targets[0];

  // Guard: if targets is empty, show placeholder
  if (!selected) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#f4f8fc" }}>
        <p className="text-slate-500">Belum ada data target. Jalankan seed SQL terlebih dahulu.</p>
      </div>
    );
  }

  const selectedStatus = statusOf(selected.pa);
  const selectedTone = TONE[selectedStatus.tone];

  // Build chart data from history — use relative time labels
  const TIME_LABELS = ["-35m", "-30m", "-25m", "-20m", "-15m", "-10m", "-5m", "Now"];
  const chartData = selected.history.map((pa, i) => ({
    label: TIME_LABELS[i] ?? `-${(selected.history.length - 1 - i) * 5}m`,
    pa,
  }));

  const avgPA = (targets.reduce((s, t) => s + t.pa, 0) / targets.length).toFixed(1);
  const warnCount = targets.filter((t) => t.pa === 6).length;
  const criticalCount = targets.filter((t) => t.pa < 6).length;

  const alerts = targets.filter((t) => t.pa <= 6).sort((a, b) => a.pa - b.pa);

  return (
    <div
      className="min-h-screen w-full"
      style={{ backgroundColor: "#f4f8fc", fontFamily: "'Inter', sans-serif", color: "#0b1f3a" }}
    >
      {/* ---------- Top bar ---------- */}
      <div className="w-full text-xs font-medium text-white" style={{ backgroundColor: NAVY_DEEP }}>
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-1.5">
          <span className="font-mono-data inline-flex items-center gap-2 tracking-wide" style={{ color: "rgba(186,222,255,0.85)" }}>
            {isConnected ? (
              <>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
                LIVE — terhubung ke database
              </>
            ) : (
              <>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]" />
                TERPUTUS — mencoba menghubungkan kembali...
              </>
            )}
          </span>
          <span className="hidden items-center gap-1.5 sm:flex" style={{ color: "rgba(186,222,255,0.85)" }}>
            {isConnected ? (
              <>
                <Wifi size={12} /> Realtime · Supabase
              </>
            ) : (
              <>
                <WifiOff size={12} /> Koneksi terputus
              </>
            )}
          </span>
        </div>
      </div>

      {/* ---------- Header / Hero ---------- */}
      <div style={{ background: `linear-gradient(180deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)` }}>
        <div className="mx-auto max-w-[1200px] px-6 pb-10 pt-6 text-white">
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
            <div className="flex items-center gap-3">
              <Link
                href="/input"
                className="hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-white/15 sm:flex"
                style={{ backgroundColor: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.4)", color: SKY }}
              >
                <PlusCircle size={14} />
                Catat PA Baru
              </Link>
              <div
                className="hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold sm:flex"
                style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
              >
                <Globe size={14} color={SKY} />
                FIR Jakarta
              </div>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <span
                className="font-mono-data inline-block rounded px-2 py-1 text-[11px] tracking-wider"
                style={{ backgroundColor: "rgba(56,189,248,0.12)", color: SKY, border: "1px solid rgba(56,189,248,0.3)" }}
              >
                FOM MONITOR · ADS-B VERSI 0 (0.26)
              </span>
              <h1 className="font-display mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
                Kualitas data ADS-B, dibaca per pesawat — bukan per stasiun.
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-relaxed" style={{ color: "rgba(210,228,255,0.85)" }}>
                Dashboard ini membaca nilai Position Accuracy (PA) — representasi Figure of Merit
                pada tiap target pesawat — dan menandainya dengan warna agar penurunan kualitas
                data dapat dikenali sebelum berkembang menjadi <em>intermittent target</em>.
              </p>
              <div className="mt-6 flex flex-wrap gap-6 text-sm">
                <div>
                  <div className="font-mono-data font-display text-2xl font-semibold">6–9</div>
                  <div className="text-xs" style={{ color: "rgba(186,222,255,0.7)" }}>Rentang PA teramati</div>
                </div>
                <div>
                  <div className="font-mono-data font-display text-2xl font-semibold" style={{ color: "#f59e0b" }}>PA = 6</div>
                  <div className="text-xs" style={{ color: "rgba(186,222,255,0.7)" }}>Ambang perlu perhatian</div>
                </div>
                <div>
                  <div className="font-mono-data font-display text-2xl font-semibold" style={{ color: "#f87171" }}>PA &lt; 6</div>
                  <div className="text-xs" style={{ color: "rgba(186,222,255,0.7)" }}>Ambang kritis</div>
                </div>
              </div>
            </div>
            <RadarSweep targets={targets} />
          </div>
        </div>
      </div>

      {/* ---------- KPI cards ---------- */}
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="-mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Target terpantau", value: targets.length, icon: Plane, tone: "good" as const },
            { label: "Rata-rata nilai PA", value: avgPA, icon: Gauge, tone: "good" as const },
            { label: "Perlu perhatian (PA=6)", value: warnCount, icon: AlertTriangle, tone: "warn" as const },
            { label: "Kualitas menurun (PA<6)", value: criticalCount, icon: AlertOctagon, tone: "bad" as const },
          ].map((k) => {
            const t = TONE[k.tone];
            const Icon = k.icon;
            return (
              <div key={k.label} className="rounded-2xl bg-white p-4 shadow-sm" style={{ border: "1px solid #e3ecf7" }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">{k.label}</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: t.bg }}>
                    <Icon size={14} color={t.text} />
                  </span>
                </div>
                <div className="font-mono-data font-display mt-2 text-2xl font-semibold" style={{ color: NAVY }}>
                  {k.value}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------- Mobile input link ---------- */}
      <div className="mx-auto max-w-[1200px] px-6 pt-4 sm:hidden">
        <Link
          href="/input"
          className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: NAVY, border: "1px solid rgba(56,189,248,0.3)" }}
        >
          <PlusCircle size={16} />
          Catat PA Baru
        </Link>
      </div>

      {/* ---------- Main content ---------- */}
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-[1.5fr_1fr]">
        {/* Table */}
        <div className="rounded-2xl bg-white shadow-sm" style={{ border: "1px solid #e3ecf7" }}>
          <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "#e3ecf7" }}>
            <div>
              <h2 className="font-display text-base font-semibold" style={{ color: NAVY }}>
                Target Pesawat
              </h2>
              <p className="text-xs text-slate-500">Klik baris untuk melihat detail parameter &amp; tren PA</p>
            </div>
            <Satellite size={16} className="text-slate-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-2 font-medium">Flight ID</th>
                  <th className="px-5 py-2 font-medium">Negara</th>
                  <th className="px-5 py-2 font-medium">PA</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 font-medium">Update</th>
                </tr>
              </thead>
              <tbody>
                {targets.map((t) => {
                  const st = statusOf(t.pa);
                  const isOpen = expandedId === t.id;
                  const isSelected = selectedId === t.id;
                  return (
                    <Fragment key={t.id}>
                      <tr
                        className="airnav-row cursor-pointer border-t"
                        style={{ borderColor: "#eef3fa", backgroundColor: isSelected ? "#f0f6ff" : "transparent" }}
                        onClick={() => {
                          setSelectedId(t.id);
                          setExpandedId(isOpen ? null : t.id);
                        }}
                      >
                        <td className="font-mono-data px-5 py-3 font-semibold" style={{ color: NAVY }}>
                          <span className="mr-2">{t.flag}</span>
                          {t.id}
                        </td>
                        <td className="px-5 py-3 text-slate-600">{t.country}</td>
                        <td className="font-mono-data px-5 py-3 font-semibold">{t.pa}</td>
                        <td className="px-5 py-3">
                          <Badge tone={st.tone}>{st.label}</Badge>
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <ChevronDown
                              size={13}
                              style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
                            />
                            {t.updated}
                          </span>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-t" style={{ borderColor: "#eef3fa", backgroundColor: "#f8fbff" }}>
                          <td colSpan={5} className="px-5 py-4">
                            <p className="mb-3 text-sm text-slate-600">{t.note}</p>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(t.params).map(([k, v]) => (
                                <span
                                  key={k}
                                  className="font-mono-data rounded-md px-2 py-1 text-xs"
                                  style={{ backgroundColor: "#eef3fa", color: "#3a5a8f" }}
                                >
                                  {k} = {v}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Trend chart */}
          <div className="rounded-2xl bg-white p-5 shadow-sm" style={{ border: "1px solid #e3ecf7" }}>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold" style={{ color: NAVY }}>
                Tren Nilai PA
              </h3>
              {selected.pa < 7 ? (
                <TrendingDown size={15} style={{ color: selectedTone.text }} />
              ) : (
                <TrendingUp size={15} style={{ color: selectedTone.text }} />
              )}
            </div>
            <p className="font-mono-data mb-4 text-xs text-slate-400">
              {selected.flag} {selected.id} · {selected.country}
            </p>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="#eef3fa" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 9]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <ReferenceLine y={7} stroke="#a9e2bf" strokeDasharray="3 3" />
                  <ReferenceLine y={6} stroke="#f3cc7d" strokeDasharray="3 3" />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #e3ecf7", fontSize: 12 }}
                    formatter={(v) => [v, "PA"]}
                  />
                  <Line type="monotone" dataKey="pa" stroke={selectedTone.dot} strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Legend */}
          <div className="rounded-2xl bg-white p-5 shadow-sm" style={{ border: "1px solid #e3ecf7" }}>
            <h3 className="font-display mb-3 text-sm font-semibold" style={{ color: NAVY }}>
              Interpretasi Nilai PA
            </h3>
            <div className="flex flex-col gap-2">
              {PA_LEGEND.map((l) => {
                const t = TONE[l.tone];
                return (
                  <div key={l.pa} className="flex items-center gap-3 text-sm">
                    <span
                      className="font-mono-data flex h-6 w-9 shrink-0 items-center justify-center rounded text-xs font-semibold"
                      style={{ backgroundColor: t.bg, color: t.text, border: `1px solid ${t.border}` }}
                    >
                      {l.pa}
                    </span>
                    <span className="text-slate-600">{l.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alerts */}
          <div className="rounded-2xl bg-white p-5 shadow-sm" style={{ border: "1px solid #e3ecf7" }}>
            <div className="mb-3 flex items-center gap-2">
              <Activity size={14} style={{ color: NAVY }} />
              <h3 className="font-display text-sm font-semibold" style={{ color: NAVY }}>
                Log Peringatan
              </h3>
            </div>
            {alerts.length === 0 ? (
              <p className="text-xs text-slate-400">Tidak ada target dengan PA ≤ 6 saat ini.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {alerts.map((t) => {
                  const st = statusOf(t.pa);
                  const tone = TONE[st.tone];
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedId(t.id);
                        setExpandedId(t.id);
                      }}
                      className="flex items-start gap-2 rounded-lg p-2 text-left"
                      style={{ backgroundColor: tone.bg }}
                    >
                      <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: tone.text }} />
                      <span className="text-xs" style={{ color: tone.text }}>
                        <span className="font-mono-data font-semibold">{t.id}</span> — PA turun ke {t.pa}.{" "}
                        {t.pa < 6 ? "Berpotensi intermittent target." : "Perlu pemantauan lanjut."}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------- Footer ---------- */}
      <div className="border-t" style={{ borderColor: "#e3ecf7" }}>
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-6 py-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-1.5">
            <Info size={12} />
            Basis analisis: Kerja Praktik Unit Surveillance JATSC, AirNav Indonesia — data stream CAT21 Ed. 0.26.
          </span>
          <span className="flex items-center gap-1.5">
            {isConnected ? <Wifi size={12} className="text-green-500" /> : <WifiOff size={12} className="text-red-400" />}
            {isConnected ? "Terhubung ke Supabase · Realtime aktif" : "Koneksi ke Supabase terputus"}
          </span>
        </div>
      </div>
    </div>
  );
}
