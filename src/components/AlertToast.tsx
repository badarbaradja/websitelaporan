"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertOctagon, X } from "lucide-react";

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
};

type ToastItemProps = {
  toast: ToastData;
  onDismiss: (id: string) => void;
};

/* ------------------------------------------------------------------
 * Single toast card
 * ------------------------------------------------------------------ */

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [exiting, setExiting] = useState(false);

  const dismiss = useCallback(() => {
    setExiting(true);
    // Wait for exit animation to complete before removing from DOM
    setTimeout(() => onDismiss(toast.id), 300);
  }, [toast.id, onDismiss]);

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    const timer = setTimeout(dismiss, 6000);
    return () => clearTimeout(timer);
  }, [dismiss]);

  return (
    <div
      className={`airnav-toast ${exiting ? "airnav-toast-exit" : ""}`}
      role="alert"
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #f3aeae",
        borderLeft: "4px solid #ef4444",
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
          backgroundColor: "#fde9e9",
          marginTop: "1px",
        }}
      >
        <AlertOctagon size={14} color="#b91c1c" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="font-mono-data text-sm font-semibold"
            style={{ color: "#b91c1c" }}
          >
            {toast.flag} {toast.targetId}
          </span>
          <span
            className="font-mono-data inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-bold"
            style={{
              backgroundColor: "#fde9e9",
              color: "#b91c1c",
              border: "1px solid #f3aeae",
              minWidth: "28px",
            }}
          >
            PA {toast.pa}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: "#7f1d1d" }}>
          PA turun ke {toast.pa}. Berpotensi intermittent target.
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
        className="shrink-0 rounded-md p-1 transition-colors hover:bg-red-50"
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
