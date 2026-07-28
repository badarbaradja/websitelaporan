import { supabase } from "./supabase";

/* ------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------ */

/** Row shape from `targets` table */
export type TargetRow = {
  id: string;
  flag: string | null;
  country: string | null;
  params: Record<string, number>;
  note: string | null;
  created_at: string;
};

/** Row shape from `pa_readings` table */
export type PaReadingRow = {
  id: number;
  target_id: string;
  pa: number;
  recorded_at: string;
  recorded_by: string | null;
};

/** Target enriched with computed PA data — used by the dashboard component */
export type TargetWithPa = {
  id: string;
  flag: string;
  country: string;
  pa: number;
  history: number[];
  params: Record<string, number>;
  note: string;
  updated: string;
};

/* ------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------ */

/** Produce a human-friendly relative time string (Indonesian) */
function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);

  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

/* ------------------------------------------------------------------
 * Queries
 * ------------------------------------------------------------------ */

/**
 * Fetch all targets with their latest PA value and last 8 readings as history.
 * Uses 2 queries and merges client-side for simplicity.
 */
export async function getTargets(): Promise<TargetWithPa[]> {
  // 1. Fetch all targets
  const { data: targets, error: tErr } = await supabase
    .from("targets")
    .select("*")
    .order("created_at", { ascending: true });

  if (tErr) throw new Error(`Failed to fetch targets: ${tErr.message}`);
  if (!targets || targets.length === 0) return [];

  // 2. Fetch all pa_readings ordered newest-first
  const { data: readings, error: rErr } = await supabase
    .from("pa_readings")
    .select("*")
    .order("recorded_at", { ascending: false });

  if (rErr) throw new Error(`Failed to fetch PA readings: ${rErr.message}`);

  // 3. Group readings by target_id
  const readingsByTarget = new Map<string, PaReadingRow[]>();
  for (const r of readings ?? []) {
    const list = readingsByTarget.get(r.target_id) ?? [];
    list.push(r);
    readingsByTarget.set(r.target_id, list);
  }

  // 4. Build enriched targets
  return (targets as TargetRow[]).map((t) => {
    const tReadings = readingsByTarget.get(t.id) ?? [];
    const latest = tReadings[0];
    // Take the last 8 readings, then reverse to oldest→newest for chart
    const historySlice = tReadings.slice(0, 8).reverse();

    return {
      id: t.id,
      flag: t.flag ?? "🏳️",
      country: t.country ?? "Tidak teridentifikasi",
      pa: latest?.pa ?? 0,
      history: historySlice.map((r) => r.pa),
      params: (t.params as Record<string, number>) ?? {},
      note: t.note ?? "",
      updated: latest ? relativeTime(latest.recorded_at) : "Belum ada data",
    };
  });
}

/**
 * Fetch PA history for a single target (most recent `limit` readings).
 * Returns in chronological order (oldest first).
 */
export async function getTargetHistory(
  targetId: string,
  limit: number = 20
): Promise<{ pa: number; recorded_at: string }[]> {
  const { data, error } = await supabase
    .from("pa_readings")
    .select("pa, recorded_at")
    .eq("target_id", targetId)
    .order("recorded_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch history: ${error.message}`);
  return (data ?? []).reverse();
}

/**
 * Add a new PA reading for a target.
 */
export async function addPaReading(
  targetId: string,
  pa: number,
  recordedBy?: string
): Promise<void> {
  const { error } = await supabase.from("pa_readings").insert({
    target_id: targetId,
    pa,
    recorded_by: recordedBy || null,
  });

  if (error) throw new Error(`Failed to add PA reading: ${error.message}`);
}

/**
 * Add a new target (aircraft).
 */
export async function addTarget(
  id: string,
  flag: string,
  country: string,
  params: Record<string, number>,
  note: string
): Promise<void> {
  const { error } = await supabase.from("targets").insert({
    id,
    flag: flag || null,
    country: country || null,
    params,
    note: note || null,
  });

  if (error) throw new Error(`Failed to add target: ${error.message}`);
}

/**
 * Fetch all target IDs (for the input form dropdown).
 */
export async function getTargetIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from("targets")
    .select("id")
    .order("id", { ascending: true });

  if (error) throw new Error(`Failed to fetch target IDs: ${error.message}`);
  return (data ?? []).map((t) => t.id);
}
