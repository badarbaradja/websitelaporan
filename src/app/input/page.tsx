"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Signal,
  Globe,
  ArrowLeft,
  PlusCircle,
  Send,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Plane,
  User,
  FileText,
  Hash,
  Flag,
  MapPin,
  Settings2,
  X,
  Plus,
} from "lucide-react";
import { addPaReading, addTarget, getTargetIds } from "@/lib/queries";

const NAVY = "#0a2a66";
const NAVY_DEEP = "#071c47";
const SKY = "#38bdf8";

type FormState = "idle" | "submitting" | "success" | "error";

export default function InputPage() {
  // Target selection
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [selectedTarget, setSelectedTarget] = useState("");
  const [isNewTarget, setIsNewTarget] = useState(false);

  // New target fields
  const [newId, setNewId] = useState("");
  const [newFlag, setNewFlag] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newParams, setNewParams] = useState<{ key: string; value: string }[]>([
    { key: "AC", value: "0" },
    { key: "MN", value: "0" },
    { key: "DC", value: "0" },
    { key: "GBS", value: "0" },
  ]);

  // PA reading fields
  const [paValue, setPaValue] = useState<number>(7);
  const [recordedBy, setRecordedBy] = useState("");

  // UI state
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Load existing target IDs on mount
  useEffect(() => {
    getTargetIds()
      .then(setTargetIds)
      .catch((err) => console.error("Failed to load target IDs:", err));
  }, []);

  const effectiveTargetId = isNewTarget ? newId.trim() : selectedTarget;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState("submitting");
    setErrorMsg("");

    try {
      // Validate
      if (!effectiveTargetId) {
        throw new Error("Pilih atau masukkan ID target terlebih dahulu.");
      }

      // If new target, create it first
      if (isNewTarget) {
        const params: Record<string, number> = {};
        for (const p of newParams) {
          if (p.key.trim()) {
            params[p.key.trim()] = Number(p.value) || 0;
          }
        }
        await addTarget(newId.trim(), newFlag, newCountry, params, newNote);
      }

      // Add PA reading
      await addPaReading(effectiveTargetId, paValue, recordedBy || undefined);

      setFormState("success");

      // Reset after success
      setTimeout(() => {
        setFormState("idle");
        if (isNewTarget) {
          // Refresh target list
          getTargetIds().then(setTargetIds).catch(console.error);
          setIsNewTarget(false);
          setNewId("");
          setNewFlag("");
          setNewCountry("");
          setNewNote("");
          setNewParams([
            { key: "AC", value: "0" },
            { key: "MN", value: "0" },
            { key: "DC", value: "0" },
            { key: "GBS", value: "0" },
          ]);
        }
        setRecordedBy("");
      }, 2500);
    } catch (err) {
      setFormState("error");
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan.");
      setTimeout(() => setFormState("idle"), 4000);
    }
  };

  const addParam = () => {
    setNewParams([...newParams, { key: "", value: "0" }]);
  };

  const removeParam = (index: number) => {
    setNewParams(newParams.filter((_, i) => i !== index));
  };

  const updateParam = (index: number, field: "key" | "value", val: string) => {
    const updated = [...newParams];
    updated[index][field] = val;
    setNewParams(updated);
  };

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "#f4f8fc", fontFamily: "'Inter', sans-serif" }}>
      {/* ---------- Header ---------- */}
      <div style={{ background: `linear-gradient(180deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)` }}>
        <div className="mx-auto max-w-[700px] px-6 pb-8 pt-6 text-white">
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
              Catat Nilai PA
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed" style={{ color: "rgba(210,228,255,0.85)" }}>
              Masukkan nilai Position Accuracy (PA) yang diamati dari layar Intelcan ADS-B Display
              untuk target pesawat yang sedang dipantau.
            </p>
          </div>
        </div>
      </div>

      {/* ---------- Form ---------- */}
      <div className="mx-auto max-w-[700px] px-6 -mt-4 pb-12">
        <form onSubmit={handleSubmit}>
          {/* Card: Target Selection */}
          <div className="rounded-2xl bg-white p-6 shadow-sm mb-4" style={{ border: "1px solid #e3ecf7" }}>
            <div className="flex items-center gap-2 mb-4">
              <Plane size={16} style={{ color: NAVY }} />
              <h2 className="font-display text-sm font-semibold" style={{ color: NAVY }}>
                Target Pesawat
              </h2>
            </div>

            {/* Toggle: existing vs new */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setIsNewTarget(false)}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
                style={{
                  backgroundColor: !isNewTarget ? NAVY : "transparent",
                  color: !isNewTarget ? "white" : "#64748b",
                  border: !isNewTarget ? "none" : "1px solid #e3ecf7",
                }}
              >
                Target yang ada
              </button>
              <button
                type="button"
                onClick={() => setIsNewTarget(true)}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
                style={{
                  backgroundColor: isNewTarget ? NAVY : "transparent",
                  color: isNewTarget ? "white" : "#64748b",
                  border: isNewTarget ? "none" : "1px solid #e3ecf7",
                }}
              >
                <span className="inline-flex items-center gap-1.5">
                  <PlusCircle size={14} />
                  Target baru
                </span>
              </button>
            </div>

            {!isNewTarget ? (
              /* Existing target dropdown */
              <div className="relative">
                <label className="mb-1.5 block text-xs font-medium text-slate-500">Flight ID / Callsign</label>
                <div className="relative">
                  <select
                    value={selectedTarget}
                    onChange={(e) => setSelectedTarget(e.target.value)}
                    className="font-mono-data w-full appearance-none rounded-xl border bg-white px-4 py-3 pr-10 text-sm font-semibold focus:outline-none focus:ring-2"
                    style={{ borderColor: "#e3ecf7", color: NAVY, focusRingColor: SKY } as React.CSSProperties}
                    required={!isNewTarget}
                  >
                    <option value="">Pilih target...</option>
                    {targetIds.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </div>
            ) : (
              /* New target fields */
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <Hash size={12} /> Flight ID / Callsign
                  </label>
                  <input
                    type="text"
                    value={newId}
                    onChange={(e) => setNewId(e.target.value.toUpperCase())}
                    placeholder="mis. GIA402, UNIDENTIFIED-05"
                    className="font-mono-data w-full rounded-xl border px-4 py-3 text-sm font-semibold placeholder:font-normal placeholder:text-slate-300 focus:outline-none focus:ring-2"
                    style={{ borderColor: "#e3ecf7", color: NAVY }}
                    required={isNewTarget}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <Flag size={12} /> Bendera (emoji)
                    </label>
                    <input
                      type="text"
                      value={newFlag}
                      onChange={(e) => setNewFlag(e.target.value)}
                      placeholder="🇮🇩"
                      className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2"
                      style={{ borderColor: "#e3ecf7" }}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <MapPin size={12} /> Negara
                    </label>
                    <input
                      type="text"
                      value={newCountry}
                      onChange={(e) => setNewCountry(e.target.value)}
                      placeholder="Indonesia"
                      className="w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2"
                      style={{ borderColor: "#e3ecf7" }}
                    />
                  </div>
                </div>

                {/* Parameters */}
                <div>
                  <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <Settings2 size={12} /> Parameter
                  </label>
                  <div className="space-y-2">
                    {newParams.map((p, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={p.key}
                          onChange={(e) => updateParam(i, "key", e.target.value)}
                          placeholder="Nama"
                          className="font-mono-data w-1/2 rounded-lg border px-3 py-2 text-xs focus:outline-none focus:ring-2"
                          style={{ borderColor: "#e3ecf7" }}
                        />
                        <span className="text-slate-300">=</span>
                        <input
                          type="number"
                          value={p.value}
                          onChange={(e) => updateParam(i, "value", e.target.value)}
                          className="font-mono-data w-20 rounded-lg border px-3 py-2 text-xs focus:outline-none focus:ring-2"
                          style={{ borderColor: "#e3ecf7" }}
                        />
                        <button
                          type="button"
                          onClick={() => removeParam(i)}
                          className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-400"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addParam}
                    className="mt-2 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50"
                    style={{ border: "1px dashed #d1d5db" }}
                  >
                    <Plus size={12} /> Tambah parameter
                  </button>
                </div>

                {/* Note */}
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <FileText size={12} /> Catatan
                  </label>
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Keterangan kualitas, mis. 'Kualitas baik, posisi stabil'"
                    rows={2}
                    className="w-full rounded-xl border px-4 py-3 text-sm placeholder:text-slate-300 focus:outline-none focus:ring-2"
                    style={{ borderColor: "#e3ecf7" }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Card: PA Value */}
          <div className="rounded-2xl bg-white p-6 shadow-sm mb-4" style={{ border: "1px solid #e3ecf7" }}>
            <div className="flex items-center gap-2 mb-4">
              <Signal size={16} style={{ color: NAVY }} />
              <h2 className="font-display text-sm font-semibold" style={{ color: NAVY }}>
                Nilai Position Accuracy (PA)
              </h2>
            </div>

            {/* PA button group */}
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((v) => {
                const isSelected = paValue === v;
                let bg = "#e3ecf7";
                let color = "#64748b";
                let borderColor = "#d1d5db";

                if (isSelected) {
                  if (v >= 7) {
                    bg = "#e6f6ec";
                    color = "#0f7a45";
                    borderColor = "#22c55e";
                  } else if (v === 6) {
                    bg = "#fff4e0";
                    color = "#a15c00";
                    borderColor = "#f59e0b";
                  } else {
                    bg = "#fde9e9";
                    color = "#b91c1c";
                    borderColor = "#ef4444";
                  }
                }

                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setPaValue(v)}
                    className="font-mono-data flex h-12 items-center justify-center rounded-xl text-lg font-semibold transition-all"
                    style={{
                      backgroundColor: isSelected ? bg : "transparent",
                      color: isSelected ? color : "#94a3b8",
                      border: `2px solid ${isSelected ? borderColor : "#e3ecf7"}`,
                      transform: isSelected ? "scale(1.08)" : "scale(1)",
                      boxShadow: isSelected ? `0 0 12px ${borderColor}40` : "none",
                    }}
                  >
                    {v}
                  </button>
                );
              })}
            </div>

            {/* PA interpretation */}
            <div className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: "#f8fbff", color: "#64748b" }}>
              {paValue >= 9 && "✅ Sangat baik — posisi akurat, tidak ada masalah."}
              {paValue === 8 && "✅ Baik — kualitas posisi masih bagus."}
              {paValue === 7 && "✅ Cukup baik — masih dalam batas aman."}
              {paValue === 6 && "⚠️ Perlu perhatian — kualitas mulai menurun, pantau terus."}
              {paValue === 5 && "🔴 Menurun — risiko intermittent target meningkat."}
              {paValue === 4 && "🔴 Menurun — kualitas rendah, perlu investigasi."}
              {paValue <= 3 && "🔴 Kritis — kualitas sangat rendah, tindakan segera diperlukan."}
            </div>
          </div>

          {/* Card: Recorded By */}
          <div className="rounded-2xl bg-white p-6 shadow-sm mb-6" style={{ border: "1px solid #e3ecf7" }}>
            <div className="flex items-center gap-2 mb-4">
              <User size={16} style={{ color: NAVY }} />
              <h2 className="font-display text-sm font-semibold" style={{ color: NAVY }}>
                Dicatat oleh
              </h2>
              <span className="text-xs text-slate-400">(opsional)</span>
            </div>
            <input
              type="text"
              value={recordedBy}
              onChange={(e) => setRecordedBy(e.target.value)}
              placeholder="Nama atau inisial petugas"
              className="w-full rounded-xl border px-4 py-3 text-sm placeholder:text-slate-300 focus:outline-none focus:ring-2"
              style={{ borderColor: "#e3ecf7" }}
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={formState === "submitting" || formState === "success"}
            className="flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-semibold text-white transition-all disabled:opacity-60"
            style={{
              backgroundColor: formState === "success" ? "#0f7a45" : NAVY,
              boxShadow: "0 4px 20px rgba(10,42,102,0.3)",
            }}
          >
            {formState === "idle" && (
              <>
                <Send size={16} /> Simpan Pembacaan PA
              </>
            )}
            {formState === "submitting" && (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Menyimpan...
              </>
            )}
            {formState === "success" && (
              <>
                <CheckCircle2 size={16} /> Berhasil disimpan!
              </>
            )}
            {formState === "error" && (
              <>
                <AlertCircle size={16} /> Gagal — coba lagi
              </>
            )}
          </button>

          {/* Error message */}
          {formState === "error" && errorMsg && (
            <div className="mt-3 rounded-xl p-3 text-xs text-red-700" style={{ backgroundColor: "#fde9e9" }}>
              {errorMsg}
            </div>
          )}

          {/* Success message */}
          {formState === "success" && (
            <div className="mt-3 rounded-xl p-3 text-xs text-green-700" style={{ backgroundColor: "#e6f6ec" }}>
              Nilai PA = {paValue} untuk <span className="font-mono-data font-semibold">{effectiveTargetId}</span>{" "}
              berhasil dicatat. Dashboard akan otomatis terupdate via Realtime.
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
