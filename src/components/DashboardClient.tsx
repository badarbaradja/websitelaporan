"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { resumeAudioContext, playAlertSound } from "@/lib/playAlertSound";
import FOMDashboard from "./FOMDashboard";
import type { AircraftWithLatestReading, DashboardStats, PaHistoryEntry, AnalysisReading } from "@/lib/queries";

const SOUND_STORAGE_KEY = "fom-alert-sound-enabled";

type DashboardClientProps = {
  initialAircraft: AircraftWithLatestReading[];
  initialStats: DashboardStats;
  latestUploadTime: string | null;
  initialHistoryMap: Record<string, PaHistoryEntry[]>;
  initialAnalysisData: AnalysisReading[];
};

export default function DashboardClient({
  initialAircraft,
  initialStats,
  latestUploadTime,
  initialHistoryMap,
  initialAnalysisData,
}: DashboardClientProps) {
  // Sound enabled state — default true, persisted in localStorage
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(true);

  // Keep ref in sync so callbacks can read latest value
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

  return (
    <FOMDashboard
      aircraft={initialAircraft}
      stats={initialStats}
      latestUploadTime={latestUploadTime}
      historyMap={initialHistoryMap}
      analysisData={initialAnalysisData}
      soundEnabled={soundEnabled}
      onToggleSound={toggleSound}
      onTestSound={testSound}
    />
  );
}
