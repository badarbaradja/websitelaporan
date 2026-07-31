-- ============================================================
-- Migration 005: CSV Upload Schema
-- Skema baru untuk alur data CSV upload + analisis historis.
-- Menggantikan skema lama (targets + pa_readings dari simulator).
-- ============================================================

-- Hapus skema lama (proyek prototipe, tidak ada data produksi)
drop table if exists pa_readings cascade;
drop table if exists targets cascade;

-- ============================================================
-- Tabel aircraft — identitas pesawat berdasarkan ICAO hex address
-- ============================================================
create table aircraft (
  aircraft_address text primary key,      -- ICAO 24-bit hex, mis. "7C4A11"
  registration text,                       -- registrasi pesawat, mis. "B-HNH"
  airline text,
  last_callsign text,
  created_at timestamptz default now()
);

-- ============================================================
-- Tabel uploads — metadata setiap sesi upload CSV
-- ============================================================
create table uploads (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  observed_at timestamptz not null,        -- waktu pengamatan (diisi user saat upload)
  uploaded_at timestamptz not null default now(),
  row_count int not null default 0,
  notes text
);

-- ============================================================
-- Tabel pa_readings — pembacaan PA per pesawat per upload
-- ============================================================
create table pa_readings (
  id bigint generated always as identity primary key,
  aircraft_address text not null references aircraft(aircraft_address) on delete cascade,
  upload_id uuid not null references uploads(id) on delete cascade,
  callsign text,
  pa smallint not null check (pa between 0 and 9),
  level integer,
  recorded_at timestamptz not null
);

-- Indexes untuk performa query
create index on pa_readings (aircraft_address, recorded_at);
create index on pa_readings (upload_id);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table aircraft enable row level security;
alter table uploads enable row level security;
alter table pa_readings enable row level security;

create policy "public read aircraft" on aircraft for select using (true);
create policy "public upsert aircraft" on aircraft for insert with check (true);
create policy "public update aircraft" on aircraft for update using (true);
create policy "public read uploads" on uploads for select using (true);
create policy "public insert uploads" on uploads for insert with check (true);
create policy "public read pa_readings" on pa_readings for select using (true);
create policy "public insert pa_readings" on pa_readings for insert with check (true);
