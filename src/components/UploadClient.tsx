"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import {
  Signal,
  Globe,
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Send,
  Clock,
  X,
} from "lucide-react";
import { submitUpload, getExistingAircraft } from "@/lib/queries";
import type { CsvRow } from "@/lib/queries";
import { resumeAudioContext, playAlertSound, startAlarmLoop } from "@/lib/playAlertSound";
import AlertToast from "./AlertToast";
import type { ToastData } from "./AlertToast";

const NAVY = "#0a2a66";
const NAVY_DEEP = "#071c47";
const SKY = "#38bdf8";

const REQUIRED_HEADERS = ["callsign", "aircraft_address", "registrasi_pesawat", "pa", "level", "airline"];

type ParsedRow = {
  rowIndex: number;
  callsign: string;
  aircraft_address: string;
  registrasi_pesawat: string;
  pa: number | null;
  level: number | null;
  airline: string;
  errors: string[];
};

type FormState = "idle" | "parsed" | "submitting" | "success" | "error";

function statusOf(pa: number) {
  if (pa >= 7) return { label: pa >= 9 ? "Sangat Baik" : pa === 8 ? "Baik" : "Cukup Baik", tone: "good" as const };
  if (pa === 6) return { label: "Perlu Perhatian", tone: "warn" as const };
  return { label: "Menurun", tone: "bad" as const };
}

const TONE = {
  good: { text: "#0f7a45", bg: "#e6f6ec", border: "#a9e2bf" },
  warn: { text: "#a15c00", bg: "#fff4e0", border: "#f3cc7d" },
  bad: { text: "#b91c1c", bg: "#fde9e9", border: "#f3aeae" },
};

export default function UploadClient() {
  const router = useRouter();

  // Form state
  const [observedAt, setObservedAt] = useState(() => {
    const now = new Date();
    // Format as local datetime-local value
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  });
  const [filename, setFilename] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [existingAircraft, setExistingAircraft] = useState<Set<string>>(new Set());
  const [isDragOver, setIsDragOver] = useState(false);

  // Alert toast state
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(true);
  const alarmLoopsRef = useRef<Map<string, () => void>>(new Map());

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("fom-alert-sound-enabled");
      if (stored !== null) {
        const val = stored === "true";
        setSoundEnabled(val);
        soundEnabledRef.current = val;
      }
    } catch { /* ignore */ }
  }, []);

  // Cleanup alarm loops on unmount
  useEffect(() => {
    return () => {
      alarmLoopsRef.current.forEach((stop) => stop());
      alarmLoopsRef.current.clear();
    };
  }, []);

  // Load existing aircraft on mount
  useEffect(() => {
    getExistingAircraft()
      .then(setExistingAircraft)
      .catch(() => { /* ignore */ });
  }, []);

  const dismissToast = useCallback((id: string) => {
    const stopFn = alarmLoopsRef.current.get(id);
    if (stopFn) {
      stopFn();
      alarmLoopsRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Computed values
  const validRows = parsedRows.filter((r) => r.errors.length === 0);
  const invalidRows = parsedRows.filter((r) => r.errors.length > 0);
  const newAircraftCount = new Set(
    validRows
      .map((r) => r.aircraft_address)
      .filter((addr) => !existingAircraft.has(addr))
  ).size;
  const existingAircraftCount = new Set(
    validRows
      .map((r) => r.aircraft_address)
      .filter((addr) => existingAircraft.has(addr))
  ).size;
  const hasErrors = invalidRows.length > 0;

  /** Parse a CSV file */
  const handleFile = useCallback((file: File) => {
    setFilename(file.name);
    setFormState("idle");
    setErrorMsg("");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim().toLowerCase(),
      complete: (results) => {
        // Validate headers
        const headers = results.meta.fields ?? [];
        const missingHeaders = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
        if (missingHeaders.length > 0) {
          setErrorMsg(`Header CSV tidak lengkap. Kolom yang hilang: ${missingHeaders.join(", ")}`);
          setFormState("error");
          return;
        }

        // Parse rows
        const rows: ParsedRow[] = (results.data as Record<string, string>[]).map((row, i) => {
          const errors: string[] = [];

          const aircraft_address = (row.aircraft_address ?? "").trim();
          if (!aircraft_address) errors.push("aircraft_address kosong");

          const callsign = (row.callsign ?? "").trim();
          const registrasi_pesawat = (row.registrasi_pesawat ?? "").trim();
          const airline = (row.airline ?? "").trim();

          const paRaw = (row.pa ?? "").trim();
          let pa: number | null = null;
          if (paRaw === "") {
            errors.push("pa kosong");
          } else {
            const paNum = parseInt(paRaw, 10);
            if (isNaN(paNum) || paNum < 0 || paNum > 9) {
              errors.push(`pa "${paRaw}" bukan angka 0-9`);
            } else {
              pa = paNum;
            }
          }

          const levelRaw = (row.level ?? "").trim();
          let level: number | null = null;
          if (levelRaw !== "") {
            const lvNum = parseInt(levelRaw, 10);
            if (!isNaN(lvNum)) level = lvNum;
          }

          return {
            rowIndex: i + 1,
            callsign,
            aircraft_address,
            registrasi_pesawat,
            pa,
            level,
            airline,
            errors,
          };
        });

        setParsedRows(rows);
        setFormState("parsed");
      },
      error: (err) => {
        setErrorMsg(`Gagal membaca file CSV: ${err.message}`);
        setFormState("error");
      },
    });
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  /** Submit validated data */
  const handleSubmit = async () => {
    if (hasErrors || validRows.length === 0) return;

    setFormState("submitting");
    setErrorMsg("");

    try {
      resumeAudioContext();

      const csvRows: CsvRow[] = validRows.map((r) => ({
        callsign: r.callsign,
        aircraft_address: r.aircraft_address,
        registrasi_pesawat: r.registrasi_pesawat,
        pa: r.pa!,
        level: r.level,
        airline: r.airline,
      }));

      const uploadId = await submitUpload({
        filename,
        observedAt: new Date(observedAt).toISOString(),
        rows: csvRows,
      });

      setFormState("success");

      // Bagian 6 — Alert toast for PA ≤ 6
      const alertRows = csvRows.filter((r) => r.pa <= 6);
      if (alertRows.length > 0) {
        const minPa = Math.min(...alertRows.map((r) => r.pa));
        const tone: "warn" | "bad" = minPa < 6 ? "bad" : "warn";

        const details = alertRows
          .sort((a, b) => a.pa - b.pa)
          .slice(0, 5)
          .map((r) => `${r.callsign || r.aircraft_address} (${r.pa})`)
          .join(", ");

        const toastId = `upload-alert-${Date.now()}`;
        const toast: ToastData = {
          id: toastId,
          title: `${alertRows.length} pesawat PA ≤ 6`,
          pa: minPa,
          message: `Terdeteksi pada upload ini: ${details}${alertRows.length > 5 ? ` dan ${alertRows.length - 5} lainnya` : ""}`,
          subtitle: filename,
          tone,
        };

        setToasts((prev) => [...prev, toast]);

        if (tone === "bad") {
          const stopFn = startAlarmLoop(soundEnabledRef);
          alarmLoopsRef.current.set(toastId, stopFn);
        } else if (soundEnabledRef.current) {
          playAlertSound("warn");
        }
      }

      // Redirect after delay
      setTimeout(() => {
        router.push(`/riwayat/${uploadId}`);
      }, 2500);
    } catch (err) {
      setFormState("error");
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan saat upload.");
    }
  };

  /** Reset file selection */
  const handleReset = () => {
    setParsedRows([]);
    setFilename("");
    setFormState("idle");
    setErrorMsg("");
  };

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "#f4f8fc", fontFamily: "'Inter', sans-serif" }}>
      {/* ---------- Header ---------- */}
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
              Upload Data CSV
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed" style={{ color: "rgba(210,228,255,0.85)" }}>
              Unggah file CSV hasil observasi ADS-B dari layar display untuk disimpan
              sebagai riwayat dan dianalisis.
            </p>
          </div>
        </div>
      </div>

      {/* ---------- Form ---------- */}
      <div className="mx-auto max-w-[800px] px-6 -mt-4 pb-12">
        {/* Card: Waktu Pengamatan */}
        <div className="rounded-2xl bg-white p-6 shadow-sm mb-4" style={{ border: "1px solid #e3ecf7" }}>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} style={{ color: NAVY }} />
            <h2 className="font-display text-sm font-semibold" style={{ color: NAVY }}>
              Waktu Pengamatan
            </h2>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Waktu saat observasi dilakukan di layar ADS-B (bukan waktu upload).
            Bisa diubah manual jika upload dilakukan belakangan.
          </p>
          <input
            type="datetime-local"
            value={observedAt}
            onChange={(e) => setObservedAt(e.target.value)}
            className="font-mono-data w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: "#e3ecf7", color: NAVY }}
          />
        </div>

        {/* Card: File Upload */}
        <div className="rounded-2xl bg-white p-6 shadow-sm mb-4" style={{ border: "1px solid #e3ecf7" }}>
          <div className="flex items-center gap-2 mb-4">
            <FileSpreadsheet size={16} style={{ color: NAVY }} />
            <h2 className="font-display text-sm font-semibold" style={{ color: NAVY }}>
              File CSV
            </h2>
          </div>

          {formState === "idle" || formState === "error" ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors"
              style={{
                borderColor: isDragOver ? SKY : "#d1d5db",
                backgroundColor: isDragOver ? "rgba(56,189,248,0.05)" : "transparent",
              }}
            >
              <Upload size={32} className="mb-3 text-slate-300" />
              <p className="text-sm text-slate-500 mb-2">
                Seret file CSV ke sini, atau
              </p>
              <label className="cursor-pointer">
                <span
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: NAVY }}
                >
                  <Upload size={14} />
                  Pilih File
                </span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
              <p className="mt-3 text-xs text-slate-400">
                Format kolom: callsign, aircraft_address, registrasi_pesawat, pa, level, airline
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl p-3" style={{ backgroundColor: "#f8fbff", border: "1px solid #eef3fa" }}>
              <div className="flex items-center gap-3">
                <FileSpreadsheet size={20} style={{ color: NAVY }} />
                <div>
                  <p className="font-mono-data text-sm font-semibold" style={{ color: NAVY }}>{filename}</p>
                  <p className="text-xs text-slate-400">{parsedRows.length} baris terdeteksi</p>
                </div>
              </div>
              {formState !== "submitting" && formState !== "success" && (
                <button
                  onClick={handleReset}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Preview table */}
        {formState === "parsed" && parsedRows.length > 0 && (
          <div className="rounded-2xl bg-white shadow-sm mb-4" style={{ border: "1px solid #e3ecf7" }}>
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "#e3ecf7" }}>
              <div>
                <h2 className="font-display text-sm font-semibold" style={{ color: NAVY }}>
                  Preview Data
                </h2>
                <div className="flex flex-wrap gap-3 mt-1 text-xs">
                  <span className="text-green-700 font-medium">{validRows.length} baris valid</span>
                  {invalidRows.length > 0 && (
                    <span className="text-red-600 font-medium">{invalidRows.length} baris error</span>
                  )}
                  <span className="text-slate-500">{newAircraftCount} pesawat baru</span>
                  <span className="text-slate-500">{existingAircraftCount} sudah tercatat</span>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto" style={{ maxHeight: 400 }}>
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-xs uppercase tracking-wide text-slate-400 border-b" style={{ borderColor: "#eef3fa" }}>
                    <th className="px-4 py-2 font-medium">#</th>
                    <th className="px-4 py-2 font-medium">Callsign</th>
                    <th className="px-4 py-2 font-medium">Address</th>
                    <th className="px-4 py-2 font-medium">Registrasi</th>
                    <th className="px-4 py-2 font-medium">PA</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Level</th>
                    <th className="px-4 py-2 font-medium">Airline</th>
                    <th className="px-4 py-2 font-medium">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row) => {
                    const hasError = row.errors.length > 0;
                    const isNew = row.aircraft_address && !existingAircraft.has(row.aircraft_address);
                    const st = row.pa !== null ? statusOf(row.pa) : null;
                    const tone = st ? TONE[st.tone] : null;

                    return (
                      <tr
                        key={row.rowIndex}
                        className="border-t"
                        style={{
                          borderColor: "#eef3fa",
                          backgroundColor: hasError ? "#fef2f2" : "transparent",
                        }}
                      >
                        <td className="px-4 py-2 text-xs text-slate-400">{row.rowIndex}</td>
                        <td className="font-mono-data px-4 py-2 font-semibold" style={{ color: NAVY }}>
                          {row.callsign || "—"}
                        </td>
                        <td className="font-mono-data px-4 py-2 text-xs text-slate-600">
                          {row.aircraft_address || "—"}
                          {isNew && (
                            <span className="ml-1 rounded px-1 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: "#e6f6ec", color: "#0f7a45" }}>
                              BARU
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-slate-600">{row.registrasi_pesawat || "—"}</td>
                        <td className="font-mono-data px-4 py-2 font-semibold">
                          {row.pa !== null ? row.pa : "—"}
                        </td>
                        <td className="px-4 py-2">
                          {st && tone ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                              style={{ color: tone.text, backgroundColor: tone.bg, border: `1px solid ${tone.border}` }}
                            >
                              {st.label}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="font-mono-data px-4 py-2 text-slate-600">{row.level ?? "—"}</td>
                        <td className="px-4 py-2 text-slate-600">{row.airline || "—"}</td>
                        <td className="px-4 py-2">
                          {hasError && (
                            <span className="text-xs text-red-600">{row.errors.join("; ")}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Error message */}
        {formState === "error" && errorMsg && (
          <div className="mb-4 rounded-xl p-3 text-xs text-red-700" style={{ backgroundColor: "#fde9e9" }}>
            <div className="flex items-center gap-2">
              <AlertCircle size={14} />
              {errorMsg}
            </div>
          </div>
        )}

        {/* Submit / success */}
        {formState === "parsed" && (
          <button
            onClick={handleSubmit}
            disabled={hasErrors || validRows.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: NAVY, boxShadow: "0 4px 20px rgba(10,42,102,0.3)" }}
          >
            <Send size={16} />
            Simpan {validRows.length} Baris Data
          </button>
        )}

        {formState === "submitting" && (
          <div className="flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-semibold text-white"
            style={{ backgroundColor: NAVY, opacity: 0.7 }}
          >
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Menyimpan...
          </div>
        )}

        {formState === "success" && (
          <div className="rounded-xl p-4 text-sm text-green-700 flex items-center gap-2" style={{ backgroundColor: "#e6f6ec" }}>
            <CheckCircle2 size={18} />
            <div>
              <span className="font-semibold">{validRows.length} baris</span> dari{" "}
              <span className="font-mono-data font-semibold">{filename}</span> berhasil disimpan.
              Mengalihkan ke halaman riwayat...
            </div>
          </div>
        )}

        {/* Validation blocking message */}
        {formState === "parsed" && hasErrors && (
          <div className="mt-3 rounded-xl p-3 text-xs text-red-700" style={{ backgroundColor: "#fde9e9" }}>
            <div className="flex items-center gap-2">
              <AlertCircle size={14} />
              {invalidRows.length} baris memiliki error validasi. Perbaiki file CSV dan upload ulang untuk melanjutkan.
            </div>
          </div>
        )}
      </div>

      {/* Alert Toasts */}
      <AlertToast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
