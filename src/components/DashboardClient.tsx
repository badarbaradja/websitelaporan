"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { getTargets } from "@/lib/queries";
import type { TargetWithPa } from "@/lib/queries";
import { playAlertSound } from "@/lib/playAlertSound";
import FOMDashboard from "./FOMDashboard";
import AlertToast from "./AlertToast";
import type { ToastData } from "./AlertToast";

const SOUND_STORAGE_KEY = "fom-alert-sound-enabled";

type DashboardClientProps = {
  initialTargets: TargetWithPa[];
};

export default function DashboardClient({ initialTargets }: DashboardClientProps) {
  const [targets, setTargets] = useState<TargetWithPa[]>(initialTargets);
  const [isConnected, setIsConnected] = useState(false);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  // Sound enabled state — default true, persisted in localStorage
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(true);

  // Keep ref in sync so realtime callback can read latest value
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Load persisted preference on mount (client-only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SOUND_STORAGE_KEY);
      if (stored !== null) {
        const val = stored === "true";
        setSoundEnabled(val);
        soundEnabledRef.current = val;
      }
    } catch {
      // localStorage unavailable, keep default
    }
  }, []);

  /** Toggle sound on/off and persist */
  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      soundEnabledRef.current = next;
      try {
        localStorage.setItem(SOUND_STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  /** Dismiss a toast by ID */
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /** Re-fetch all targets from Supabase */
  const refresh = useCallback(async () => {
    try {
      const fresh = await getTargets();
      setTargets(fresh);
    } catch (err) {
      console.error("[DashboardClient] Failed to refresh targets:", err);
    }
  }, []);

  useEffect(() => {
    // Subscribe to Supabase Realtime on pa_readings table
    const channel = supabase
      .channel("pa_readings_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pa_readings",
        },
        (payload) => {
          const newRow = payload.new as {
            id: number;
            target_id: string;
            pa: number;
            recorded_at: string;
            recorded_by: string | null;
          };

          // Refresh dashboard data
          refresh();

          // If PA <= 6, show a toast notification (warn for 6, bad for <6)
          if (newRow.pa <= 6) {
            const tone: "warn" | "bad" = newRow.pa === 6 ? "warn" : "bad";

            // Look up target info from current targets state
            setTargets((currentTargets) => {
              const target = currentTargets.find((t) => t.id === newRow.target_id);

              const now = new Date();
              const timeStr = now.toLocaleTimeString("id-ID", { hour12: false });

              const toast: ToastData = {
                id: `toast-${newRow.id}-${Date.now()}`,
                targetId: newRow.target_id,
                flag: target?.flag ?? "🏳️",
                country: target?.country ?? "Tidak diketahui",
                pa: newRow.pa,
                time: timeStr,
                tone,
              };

              setToasts((prev) => [...prev, toast]);

              // Play alert sound if enabled (read from ref for latest value)
              if (soundEnabledRef.current) {
                playAlertSound(tone);
              }

              return currentTargets; // Don't modify targets here
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "targets",
        },
        (_payload) => {
          // New target added → refresh
          refresh();
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return (
    <>
      <FOMDashboard
        targets={targets}
        isConnected={isConnected}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
      />
      <AlertToast toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
