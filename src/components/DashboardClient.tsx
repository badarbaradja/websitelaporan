"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getTargets } from "@/lib/queries";
import type { TargetWithPa } from "@/lib/queries";
import FOMDashboard from "./FOMDashboard";
import AlertToast from "./AlertToast";
import type { ToastData } from "./AlertToast";

type DashboardClientProps = {
  initialTargets: TargetWithPa[];
};

export default function DashboardClient({ initialTargets }: DashboardClientProps) {
  const [targets, setTargets] = useState<TargetWithPa[]>(initialTargets);
  const [isConnected, setIsConnected] = useState(false);
  const [toasts, setToasts] = useState<ToastData[]>([]);

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

          // If PA < 6, show a toast notification
          if (newRow.pa < 6) {
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
              };

              setToasts((prev) => [...prev, toast]);

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
      <FOMDashboard targets={targets} isConnected={isConnected} />
      <AlertToast toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
