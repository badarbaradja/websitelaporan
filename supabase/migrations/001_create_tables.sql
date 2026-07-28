-- ============================================================
-- FOM / ADS-B Quality Monitor — Database Schema
-- AirNav Indonesia · JATSC Unit Surveillance
-- ============================================================

-- Tabel target pesawat
-- Menyimpan identitas tiap target yang dipantau (callsign, negara, parameter).
-- Nilai PA TIDAK disimpan di sini — dihitung dari tabel pa_readings.
create table if not exists targets (
  id text primary key,                -- Flight ID / callsign, mis. "UBA1"
  flag text,                          -- Emoji bendera negara (opsional)
  country text,                       -- Nama negara / "Tidak teridentifikasi"
  params jsonb default '{}'::jsonb,   -- Parameter tambahan: AC, MN, DC, GBS, TST, RAB, dll.
  note text,                          -- Keterangan/catatan teknisi
  created_at timestamptz default now()
);

-- Tabel pembacaan PA (time-series)
-- Setiap kali petugas membaca nilai PA dari layar Intelcan, satu baris
-- ditambahkan di sini. current_pa dihitung dari baris terbaru per target.
create table if not exists pa_readings (
  id bigint generated always as identity primary key,
  target_id text references targets(id) on delete cascade,
  pa smallint not null check (pa between 0 and 9),
  recorded_at timestamptz default now(),
  recorded_by text                    -- Nama/inisial petugas pencatat (opsional)
);

-- Index untuk performa query: ambil PA terbaru per target
create index if not exists idx_pa_readings_target_time
  on pa_readings(target_id, recorded_at desc);

-- Enable Realtime untuk tabel pa_readings
-- NOTE: Kamu juga perlu mengaktifkan Replication untuk tabel ini
-- di Supabase Dashboard → Database → Replication → pilih pa_readings
alter publication supabase_realtime add table pa_readings;
