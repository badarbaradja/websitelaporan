"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertOctagon, AlertTriangle, X } from "lucide-react";

/* ------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------ */

export type ToastData = {
  id: string;
  targetId: string;
  flag: string;
  country: string;
  pa: number;
  time: string;
  tone: "warn" | "bad";
};

type ToastItemProps = {
  toast: ToastData;
  onDismiss: (id: string) => void;
};

/* ------------------------------------------------------------------
 * Tone-specific styles
 * ------------------------------------------------------------------ */

const TOAST_STYLES = {
  warn: {
    border: "1px solid #f3cc7d",
    borderLeft: "4px solid #f59e0b",
    iconBg: "#fff4e0",
    iconColor: "#a15c00",
    titleColor: "#a15c00",
    badgeBg: "#fff4e0",
    badgeColor: "#a15c00",
    badgeBorder: "1px solid #f3cc7d",
    bodyColor: "#78560b",
    hoverBg: "hover:bg-amber-50",
  },
  bad: {
    border: "1px solid #f3aeae",
    borderLeft: "4px solid #ef4444",
    iconBg: "#fde9e9",
    iconColor: "#b91c1c",
    titleColor: "#b91c1c",
    badgeBg: "#fde9e9",
    badgeColor: "#b91c1c",
    badgeBorder: "1px solid #f3aeae",
    bodyColor: "#7f1d1d",
    hoverBg: "hover:bg-red-50",
  },
};

/* ------------------------------------------------------------------
 * Single toast card
 * ------------------------------------------------------------------ */

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [exiting, setExiting] = useState(false);
  const s = TOAST_STYLES[toast.tone];

  const Icon = toast.tone === "bad" ? AlertOctagon : AlertTriangle;

  const message =
    toast.tone === "bad"
      ? `PA turun ke ${toast.pa}. Berpotensi intermittent target.`
      : `PA turun ke 6. Perlu pemantauan lanjut.`;

  const dismiss = useCallback(() => {
    setExiting(true);
    // Wait for exit animation to complete before removing from DOM
    setTimeout(() => onDismiss(toast.id), 300);
  }, [toast.id, onDismiss]);

  // Auto-dismiss after 6 seconds — only for "warn" toasts.
  // "bad" toasts persist until manually dismissed (alarm behavior).
  useEffect(() => {
    if (toast.tone !== "warn") return;
    const timer = setTimeout(dismiss, 6000);
    return () => clearTimeout(timer);
  }, [dismiss, toast.tone]);

  return (
    <div
      className={`airnav-toast ${exiting ? "airnav-toast-exit" : ""}`}
      role="alert"
      style={{
        backgroundColor: "#ffffff",
        border: s.border,
        borderLeft: s.borderLeft,
        borderRadius: "12px",
        padding: "12px 14px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
        maxWidth: "380px",
        width: "100%",
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
      }}
    >
      {/* Icon */}
      <div
        className="shrink-0 flex items-center justify-center rounded-full"
        style={{
          width: "28px",
          height: "28px",
          backgroundColor: s.iconBg,
          marginTop: "1px",
        }}
      >
        <Icon size={14} color={s.iconColor} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="font-mono-data text-sm font-semibold"
            style={{ color: s.titleColor }}
          >
            {toast.flag} {toast.targetId}
          </span>
          <span
            className="font-mono-data inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-bold"
            style={{
              backgroundColor: s.badgeBg,
              color: s.badgeColor,
              border: s.badgeBorder,
              minWidth: "28px",
            }}
          >
            PA {toast.pa}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: s.bodyColor }}>
          {message}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-[10px]" style={{ color: "#94a3b8" }}>
            {toast.country} · {toast.time}
          </span>
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={dismiss}
        className={`shrink-0 rounded-md p-1 transition-colors ${s.hoverBg}`}
        style={{ color: "#d1d5db" }}
        aria-label="Tutup notifikasi"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------
 * Toast container (fixed top-right)
 * ------------------------------------------------------------------ */

type AlertToastContainerProps = {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
};

export default function AlertToast({ toasts, onDismiss }: AlertToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "16px",
        right: "16px",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: "auto" }}>
          <ToastItem toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
