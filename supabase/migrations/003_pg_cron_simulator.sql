-- ============================================================
-- FOM / ADS-B Quality Monitor — pg_cron PA Simulator
-- AirNav Indonesia · JATSC Unit Surveillance
--
-- Memindahkan logic random-walk PA dari scripts/simulate.mjs
-- (Node lokal) ke Supabase server-side via pg_cron.
--
-- Keuntungan:
--   • Data tetap "hidup" 24/7 tanpa laptop developer menyala
--   • Tidak bergantung pada terminal lokal
--   • Deploy sekali, jalan selamanya di server Supabase
--
-- Catatan penting tentang interval:
--   pg_cron minimum interval = 1 MENIT (bukan per detik).
--   Untuk demo presentasi yang butuh update lebih cepat (5–8 detik),
--   tetap gunakan scripts/simulate.mjs secara lokal.
--
-- Cara menjalankan:
--   Paste SQL ini di Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- 1. Aktifkan extension pg_cron (jika belum)
--    Di Supabase, pg_cron sudah tersedia di semua project.
--    Extension ini harus di-create di schema pg_catalog (default).
create extension if not exists pg_cron;

-- ============================================================
-- 2. Function: simulate_pa_tick()
--
-- Logic (mirror dari scripts/simulate.mjs):
--   1. Pilih satu target secara acak dari tabel targets
--   2. Ambil PA terakhir target itu dari pa_readings
--   3. Hitung PA baru = PA lama + random(-2, +2)
--   4. Sesekali (1/6 chance) paksa penurunan -2 sampai -3
--   5. Clamp hasil ke 0–9
--   6. Insert baris baru ke pa_readings
--
-- Function ini berjalan sebagai SECURITY DEFINER (role postgres),
-- sehingga RLS policies TIDAK menghalangi insert-nya.
-- ============================================================
create or replace function public.simulate_pa_tick()
returns void
language plpgsql
security definer   -- jalan sebagai owner (postgres), bypass RLS
set search_path = public
as $$
declare
  v_target_id   text;
  v_old_pa      smallint;
  v_step        int;
  v_new_pa      smallint;
  v_force_drop  boolean;
begin
  -- 1. Pilih satu target secara acak
  select id into v_target_id
  from targets
  order by random()
  limit 1;

  -- Kalau tidak ada target, skip (jangan error)
  if v_target_id is null then
    raise notice 'simulate_pa_tick: tidak ada target di tabel targets, skip.';
    return;
  end if;

  -- 2. Ambil PA terakhir target ini
  select pa into v_old_pa
  from pa_readings
  where target_id = v_target_id
  order by recorded_at desc
  limit 1;

  -- Default ke 7 kalau belum ada reading
  if v_old_pa is null then
    v_old_pa := 7;
  end if;

  -- 3. Tentukan apakah forced drop (1/6 chance ≈ 16.7%)
  v_force_drop := (random() < (1.0 / 6.0));

  -- 4. Hitung step
  if v_force_drop then
    -- Forced drop: step antara -3 dan -2
    v_step := floor(random() * 2)::int - 3;   -- menghasilkan -3 atau -2
  else
    -- Normal random walk: step antara -2 dan +2
    v_step := floor(random() * 5)::int - 2;   -- menghasilkan -2, -1, 0, 1, atau 2
  end if;

  -- 5. Hitung PA baru, clamp ke 0–9
  v_new_pa := greatest(0, least(9, v_old_pa + v_step))::smallint;

  -- 6. Insert reading baru
  insert into pa_readings (target_id, pa, recorded_by)
  values (v_target_id, v_new_pa, 'Simulator (cron)');

end;
$$;

-- ============================================================
-- 3. Jadwalkan cron job: jalankan simulate_pa_tick() setiap 1 menit
--
-- Nama job: 'simulate-pa-tick'
-- Schedule:  '* * * * *' = setiap menit
--
-- pg_cron jobs jalan sebagai role postgres, sehingga punya akses
-- penuh ke semua tabel tanpa terhalang RLS.
-- ============================================================
select cron.schedule(
  'simulate-pa-tick',        -- nama job (dipakai untuk unschedule)
  '* * * * *',               -- setiap 1 menit
  $$select public.simulate_pa_tick()$$
);

-- ============================================================
-- Verifikasi: lihat daftar cron jobs yang terjadwal
-- (output muncul di Results tab di SQL Editor)
-- ============================================================
select jobid, jobname, schedule, command
from cron.job
where jobname = 'simulate-pa-tick';

-- ============================================================
-- CARA MENONAKTIFKAN (jalankan SQL ini kalau mau berhenti):
--
--   select cron.unschedule('simulate-pa-tick');
--
-- CARA MENGAKTIFKAN KEMBALI:
--
--   select cron.schedule(
--     'simulate-pa-tick',
--     '* * * * *',
--     $$select public.simulate_pa_tick()$$
--   );
-- ============================================================
