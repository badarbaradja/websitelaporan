import { supabase } from "./supabase";

/* ------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------ */

/** Aircraft row from the `aircraft` table */
export type AircraftRow = {
  aircraft_address: string;
  registration: string | null;
  airline: string | null;
  last_callsign: string | null;
  created_at: string;
};

/** Upload row from the `uploads` table */
export type UploadRow = {
  id: string;
  filename: string;
  observed_at: string;
  uploaded_at: string;
  row_count: number;
  notes: string | null;
};

/** PA reading row from the `pa_readings` table */
export type PaReadingRow = {
  id: number;
  aircraft_address: string;
  upload_id: string;
  callsign: string | null;
  pa: number;
  level: number | null;
  recorded_at: string;
};

/** Aircraft with its latest PA reading — used by the dashboard */
export type AircraftWithLatestReading = {
  aircraft_address: string;
  registration: string | null;
  airline: string | null;
  callsign: string | null;
  pa: number;
  level: number | null;
  recorded_at: string;
};

/** Dashboard stats */
export type DashboardStats = {
  aircraftCount: number;
  uploadCount: number;
  warnCount: number;     // PA = 6 (latest reading per aircraft)
  criticalCount: number; // PA < 6 (latest reading per aircraft)
};

/** History entry for a single aircraft */
export type PaHistoryEntry = {
  pa: number;
  recorded_at: string;
  upload_id: string;
};

/** Upload detail row — pa_reading joined with aircraft info */
export type UploadDetailRow = {
  id: number;
  aircraft_address: string;
  registration: string | null;
  airline: string | null;
  callsign: string | null;
  pa: number;
  level: number | null;
  recorded_at: string;
};

/** CSV row as parsed from the uploaded file */
export type CsvRow = {
  callsign: string;
  aircraft_address: string;
  registrasi_pesawat: string;
  pa: number;
  level: number | null;
  airline: string;
};

/** Full reading data for analysis panels */
export type AnalysisReading = {
  aircraft_address: string;
  registration: string | null;
  airline: string | null;
  callsign: string | null;
  pa: number;
  recorded_at: string;
  upload_id: string;
  upload_filename: string;
  upload_observed_at: string;
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

/** Format date for display */
export function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Format short time for chart axis */
export function formatShortTime(isoString: string): string {
  return new Date(isoString).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/* ------------------------------------------------------------------
 * Queries — Dashboard
 * ------------------------------------------------------------------ */

/**
 * Fetch all aircraft with their latest PA reading.
 * Uses client-side grouping for simplicity (Supabase JS doesn't support DISTINCT ON).
 */
export async function getAircraftWithLatestReading(): Promise<AircraftWithLatestReading[]> {
  // Fetch all aircraft
  const { data: aircraft, error: aErr } = await supabase
    .from("aircraft")
    .select("*")
    .order("created_at", { ascending: true });

  if (aErr) throw new Error(`Failed to fetch aircraft: ${aErr.message}`);
  if (!aircraft || aircraft.length === 0) return [];

  // Fetch all readings ordered by recorded_at desc
  const { data: readings, error: rErr } = await supabase
    .from("pa_readings")
    .select("*")
    .order("recorded_at", { ascending: false });

  if (rErr) throw new Error(`Failed to fetch readings: ${rErr.message}`);

  // Group by aircraft_address, take the latest reading per aircraft
  const latestByAircraft = new Map<string, PaReadingRow>();
  for (const r of readings ?? []) {
    if (!latestByAircraft.has(r.aircraft_address)) {
      latestByAircraft.set(r.aircraft_address, r);
    }
  }

  return (aircraft as AircraftRow[]).map((a) => {
    const latest = latestByAircraft.get(a.aircraft_address);
    return {
      aircraft_address: a.aircraft_address,
      registration: a.registration,
      airline: a.airline,
      callsign: latest?.callsign ?? a.last_callsign,
      pa: latest?.pa ?? 0,
      level: latest?.level ?? null,
      recorded_at: latest?.recorded_at ?? a.created_at,
    };
  });
}

/**
 * Get dashboard statistics (computed from latest reading per aircraft).
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const aircraft = await getAircraftWithLatestReading();

  const { count: uploadCount, error: uErr } = await supabase
    .from("uploads")
    .select("*", { count: "exact", head: true });

  if (uErr) throw new Error(`Failed to count uploads: ${uErr.message}`);

  let warnCount = 0;
  let criticalCount = 0;
  for (const a of aircraft) {
    if (a.pa === 6) warnCount++;
    if (a.pa < 6) criticalCount++;
  }

  return {
    aircraftCount: aircraft.length,
    uploadCount: uploadCount ?? 0,
    warnCount,
    criticalCount,
  };
}

/**
 * Get the observed_at of the most recent upload.
 */
export async function getLatestUploadTime(): Promise<string | null> {
  const { data, error } = await supabase
    .from("uploads")
    .select("observed_at")
    .order("observed_at", { ascending: false })
    .limit(1);

  if (error) throw new Error(`Failed to fetch latest upload: ${error.message}`);
  return data?.[0]?.observed_at ?? null;
}

/**
 * Fetch PA history for a single aircraft (all readings, ordered by recorded_at ascending).
 */
export async function getAircraftHistory(
  aircraftAddress: string
): Promise<PaHistoryEntry[]> {
  const { data, error } = await supabase
    .from("pa_readings")
    .select("pa, recorded_at, upload_id")
    .eq("aircraft_address", aircraftAddress)
    .order("recorded_at", { ascending: true });

  if (error) throw new Error(`Failed to fetch history: ${error.message}`);
  return data ?? [];
}

/* ------------------------------------------------------------------
 * Queries — Upload
 * ------------------------------------------------------------------ */

/**
 * Get existing aircraft addresses (for preview: detect new vs existing).
 */
export async function getExistingAircraft(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("aircraft")
    .select("aircraft_address");

  if (error) throw new Error(`Failed to fetch aircraft: ${error.message}`);
  return new Set((data ?? []).map((a) => a.aircraft_address));
}

/**
 * Submit a CSV upload batch.
 * 1. Insert into `uploads` → get id
 * 2. Upsert all unique aircraft_address into `aircraft`
 * 3. Bulk insert all rows into `pa_readings`
 *
 * Returns the upload id.
 */
export async function submitUpload({
  filename,
  observedAt,
  rows,
}: {
  filename: string;
  observedAt: string; // ISO timestamp
  rows: CsvRow[];
}): Promise<string> {
  // 1. Insert upload record
  const { data: uploadData, error: uploadErr } = await supabase
    .from("uploads")
    .insert({
      filename,
      observed_at: observedAt,
      row_count: rows.length,
    })
    .select("id")
    .single();

  if (uploadErr) throw new Error(`Failed to create upload: ${uploadErr.message}`);
  const uploadId = uploadData.id;

  // 2. Upsert unique aircraft
  const uniqueAircraft = new Map<string, {
    aircraft_address: string;
    registration: string;
    airline: string;
    last_callsign: string;
  }>();

  for (const row of rows) {
    if (!uniqueAircraft.has(row.aircraft_address)) {
      uniqueAircraft.set(row.aircraft_address, {
        aircraft_address: row.aircraft_address,
        registration: row.registrasi_pesawat || "",
        airline: row.airline || "",
        last_callsign: row.callsign || "",
      });
    }
  }

  const aircraftRows = Array.from(uniqueAircraft.values());

  if (aircraftRows.length > 0) {
    const { error: acErr } = await supabase
      .from("aircraft")
      .upsert(aircraftRows, {
        onConflict: "aircraft_address",
      });

    if (acErr) throw new Error(`Failed to upsert aircraft: ${acErr.message}`);
  }

  // 3. Bulk insert PA readings
  const readings = rows.map((row) => ({
    aircraft_address: row.aircraft_address,
    upload_id: uploadId,
    callsign: row.callsign || null,
    pa: row.pa,
    level: row.level,
    recorded_at: observedAt,
  }));

  if (readings.length > 0) {
    const { error: prErr } = await supabase
      .from("pa_readings")
      .insert(readings);

    if (prErr) throw new Error(`Failed to insert readings: ${prErr.message}`);
  }

  return uploadId;
}

/* ------------------------------------------------------------------
 * Queries — Analysis Panel
 * ------------------------------------------------------------------ */

/**
 * Fetch all readings with aircraft + upload info for client-side analysis.
 */
export async function getAnalysisData(): Promise<AnalysisReading[]> {
  // Fetch all readings
  const { data: readings, error: rErr } = await supabase
    .from("pa_readings")
    .select("*")
    .order("recorded_at", { ascending: true });

  if (rErr) throw new Error(`Failed to fetch readings: ${rErr.message}`);
  if (!readings || readings.length === 0) return [];

  // Fetch all aircraft
  const { data: aircraft, error: aErr } = await supabase
    .from("aircraft")
    .select("*");

  if (aErr) throw new Error(`Failed to fetch aircraft: ${aErr.message}`);

  // Fetch all uploads
  const { data: uploads, error: uErr } = await supabase
    .from("uploads")
    .select("*");

  if (uErr) throw new Error(`Failed to fetch uploads: ${uErr.message}`);

  // Build lookup maps
  const aircraftMap = new Map<string, AircraftRow>();
  for (const a of aircraft ?? []) {
    aircraftMap.set(a.aircraft_address, a);
  }

  const uploadMap = new Map<string, UploadRow>();
  for (const u of uploads ?? []) {
    uploadMap.set(u.id, u);
  }

  // Join data client-side
  return (readings as PaReadingRow[]).map((r) => {
    const ac = aircraftMap.get(r.aircraft_address);
    const up = uploadMap.get(r.upload_id);
    return {
      aircraft_address: r.aircraft_address,
      registration: ac?.registration ?? null,
      airline: ac?.airline ?? null,
      callsign: r.callsign,
      pa: r.pa,
      recorded_at: r.recorded_at,
      upload_id: r.upload_id,
      upload_filename: up?.filename ?? "",
      upload_observed_at: up?.observed_at ?? r.recorded_at,
    };
  });
}

/* ------------------------------------------------------------------
 * Queries — Riwayat Upload
 * ------------------------------------------------------------------ */

/**
 * Get all uploads, ordered by observed_at descending.
 */
export async function getUploadsList(): Promise<UploadRow[]> {
  const { data, error } = await supabase
    .from("uploads")
    .select("*")
    .order("observed_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch uploads: ${error.message}`);
  return (data ?? []) as UploadRow[];
}

/**
 * Get a single upload by ID.
 */
export async function getUploadById(id: string): Promise<UploadRow | null> {
  const { data, error } = await supabase
    .from("uploads")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as UploadRow;
}

/**
 * Get all PA readings for a specific upload, joined with aircraft info.
 */
export async function getUploadReadings(uploadId: string): Promise<UploadDetailRow[]> {
  // Fetch readings for this upload
  const { data: readings, error: rErr } = await supabase
    .from("pa_readings")
    .select("*")
    .eq("upload_id", uploadId)
    .order("callsign", { ascending: true });

  if (rErr) throw new Error(`Failed to fetch upload readings: ${rErr.message}`);
  if (!readings || readings.length === 0) return [];

  // Fetch aircraft for join
  const addresses = [...new Set(readings.map((r) => r.aircraft_address))];
  const { data: aircraft, error: aErr } = await supabase
    .from("aircraft")
    .select("*")
    .in("aircraft_address", addresses);

  if (aErr) throw new Error(`Failed to fetch aircraft: ${aErr.message}`);

  const aircraftMap = new Map<string, AircraftRow>();
  for (const a of (aircraft ?? []) as AircraftRow[]) {
    aircraftMap.set(a.aircraft_address, a);
  }

  return (readings as PaReadingRow[]).map((r) => {
    const ac = aircraftMap.get(r.aircraft_address);
    return {
      id: r.id,
      aircraft_address: r.aircraft_address,
      registration: ac?.registration ?? null,
      airline: ac?.airline ?? null,
      callsign: r.callsign,
      pa: r.pa,
      level: r.level,
      recorded_at: r.recorded_at,
    };
  });
}

/* ------------------------------------------------------------------
 * Re-exports (kept for backward compatibility of helpers)
 * ------------------------------------------------------------------ */

export { relativeTime };
