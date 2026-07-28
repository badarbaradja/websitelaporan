#!/usr/bin/env node

/**
 * FOM / ADS-B Quality Monitor — PA Simulator
 *
 * Inserts random PA readings into Supabase every 5–8 seconds,
 * making the dashboard come alive during demos without manual input.
 *
 * Usage:
 *   npm run simulate
 *   (run in a separate terminal alongside `npm run dev`)
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 * from .env.local via --env-file flag (set in package.json script).
 */

import ws from "ws";
import { createClient } from "@supabase/supabase-js";

/* ------------------------------------------------------------------
 * Config
 * ------------------------------------------------------------------ */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "\x1b[31m✖ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.\n" +
      "  Make sure .env.local exists and contains both variables.\x1b[0m"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: {
    transport: ws,
  },
});

const MIN_INTERVAL_MS = 5_000;
const MAX_INTERVAL_MS = 8_000;
const FORCE_DROP_CHANCE = 1 / 6; // ~16.7% chance of forced PA drop

/* ------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------ */

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomInterval() {
  return randomInt(MIN_INTERVAL_MS, MAX_INTERVAL_MS);
}

function timestamp() {
  return new Date().toLocaleTimeString("id-ID", { hour12: false });
}

/* ------------------------------------------------------------------
 * Core simulation
 * ------------------------------------------------------------------ */

async function getRandomTarget() {
  const { data, error } = await supabase
    .from("targets")
    .select("id, flag, country");

  if (error || !data || data.length === 0) {
    throw new Error(error?.message ?? "No targets found in database.");
  }

  return data[randomInt(0, data.length - 1)];
}

async function getLatestPa(targetId) {
  const { data, error } = await supabase
    .from("pa_readings")
    .select("pa")
    .eq("target_id", targetId)
    .order("recorded_at", { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  return data?.[0]?.pa ?? 7; // Default to 7 if no readings yet
}

async function insertReading(targetId, pa) {
  const { error } = await supabase.from("pa_readings").insert({
    target_id: targetId,
    pa,
    recorded_by: "Simulator",
  });

  if (error) throw new Error(error.message);
}

async function tick() {
  try {
    const target = await getRandomTarget();
    const oldPa = await getLatestPa(target.id);

    let step;
    const forceDropThisTime = Math.random() < FORCE_DROP_CHANCE;

    if (forceDropThisTime) {
      // Force a significant drop: -2 to -3
      step = randomInt(-3, -2);
    } else {
      // Normal random walk: -2 to +2
      step = randomInt(-2, 2);
    }

    const newPa = clamp(oldPa + step, 0, 9);
    await insertReading(target.id, newPa);

    // Build log message
    const arrow = newPa > oldPa ? "↑" : newPa < oldPa ? "↓" : "→";
    const warn = newPa < 6 ? " ⚠️" : "";
    const color = newPa < 6 ? "\x1b[31m" : newPa === 6 ? "\x1b[33m" : "\x1b[32m";
    const reset = "\x1b[0m";
    const forced = forceDropThisTime ? " [FORCED DROP]" : "";

    console.log(
      `\x1b[90m[${timestamp()}]\x1b[0m ${target.flag ?? "🏳️"}  ` +
        `\x1b[1m${target.id}\x1b[0m (${target.country ?? "?"}) : ` +
        `${color}${oldPa} ${arrow} ${newPa}${reset}${warn}${forced}`
    );
  } catch (err) {
    console.error(`\x1b[31m[${timestamp()}] Error: ${err.message}\x1b[0m`);
  }
}

/* ------------------------------------------------------------------
 * Main loop
 * ------------------------------------------------------------------ */

let timeoutId = null;
let running = true;

function scheduleNext() {
  if (!running) return;
  const delay = randomInterval();
  timeoutId = setTimeout(async () => {
    await tick();
    scheduleNext();
  }, delay);
}

// Graceful shutdown
process.on("SIGINT", () => {
  running = false;
  if (timeoutId) clearTimeout(timeoutId);
  console.log("\n\x1b[36m⏹  Simulator dihentikan.\x1b[0m");
  process.exit(0);
});

process.on("SIGTERM", () => {
  running = false;
  if (timeoutId) clearTimeout(timeoutId);
  process.exit(0);
});

// Start
console.log(
  "\x1b[36m" +
    "╔═══════════════════════════════════════════════════╗\n" +
    "║   FOM Simulator — ADS-B PA Random Walk           ║\n" +
    "║   Insert baru setiap 5–8 detik                   ║\n" +
    "║   Tekan Ctrl+C untuk berhenti                    ║\n" +
    "╚═══════════════════════════════════════════════════╝" +
    "\x1b[0m\n"
);

// Run first tick immediately, then schedule
await tick();
scheduleNext();
