"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { getTargets } from "@/lib/queries";
import type { TargetWithPa } from "@/lib/queries";
import { playAlertSound, resumeAudioContext, startAlarmLoop } from "@/lib/playAlertSound";
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

  // Map of active alarm loops: toastId → stop function
  // Used to clean up repeating alarms when a "bad" toast is dismissed.
  const alarmLoopsRef = useRef<Map<string, () => void>>(new Map());

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

  // Cleanup all alarm loops on unmount to prevent leaked intervals
  useEffect(() => {
    return () => {
      alarmLoopsRef.current.forEach((stop) => stop());
      alarmLoopsRef.current.clear();
    };
  }, []);

  /** Toggle sound on/off and persist.
   *  Calling resumeAudioContext() here is CRITICAL — this runs inside a
   *  direct onClick handler, which counts as a user gesture and unlocks
   *  the AudioContext for the rest of the browser session. */
  const toggleSound = useCallback(() => {
    // Unlock audio on every click (idempotent, only matters the first time)
    resumeAudioContext();

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

  /** Test sound — plays a beep immediately (also a user gesture → unlocks audio) */
  const testSound = useCallback(() => {
    resumeAudioContext();
    playAlertSound("warn");
  }, []);

  /** Dismiss a toast by ID — also stops its alarm loop if any */
  const dismissToast = useCallback((id: string) => {
    // Stop alarm loop for this toast if one exists
    const stopFn = alarmLoopsRef.current.get(id);
    if (stopFn) {
      stopFn();
      alarmLoopsRef.current.delete(id);
    }

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

              const toastId = `toast-${newRow.id}-${Date.now()}`;

              const toast: ToastData = {
                id: toastId,
                targetId: newRow.target_id,
                flag: target?.flag ?? "🏳️",
                country: target?.country ?? "Tidak diketahui",
                pa: newRow.pa,
                time: timeStr,
                tone,
              };

              setToasts((prev) => [...prev, toast]);

              // Sound handling
              if (tone === "bad") {
                // Start repeating alarm loop — runs every 3s until toast is dismissed
                const stopFn = startAlarmLoop(soundEnabledRef);
                alarmLoopsRef.current.set(toastId, stopFn);
              } else {
                // "warn" — single beep
                if (soundEnabledRef.current) {
                  playAlertSound("warn");
                }
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
        onTestSound={testSound}
      />
      <AlertToast toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
