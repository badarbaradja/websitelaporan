-- ============================================================
-- Migration 004: Cleanup Simulator
-- Menghapus cron job dan function simulator yang sudah tidak dipakai.
-- Alur data sekarang: CSV upload manual, bukan simulator random.
-- ============================================================

-- 1. Unschedule cron job 'simulate-pa-tick' (dengan exception handler)
do $$
begin
  perform cron.unschedule('simulate-pa-tick');
exception
  when undefined_table then
    raise notice 'pg_cron not available, skipping unschedule.';
  when others then
    raise notice 'Cron job simulate-pa-tick not found or already removed, skipping.';
end;
$$;

-- 2. Drop the simulator function
drop function if exists public.simulate_pa_tick();
