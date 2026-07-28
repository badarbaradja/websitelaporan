-- ============================================================
-- FOM / ADS-B Quality Monitor — RLS Policies
-- Allows anon inserts for simulator and input form
-- ============================================================

-- Enable RLS on tables (may already be enabled by default)
alter table targets enable row level security;
alter table pa_readings enable row level security;

-- Allow anyone (anon) to read targets
create policy "Allow public read on targets"
  on targets for select
  using (true);

-- Allow anyone (anon) to insert targets (needed for input form)
create policy "Allow public insert on targets"
  on targets for insert
  with check (true);

-- Allow anyone (anon) to read pa_readings
create policy "Allow public read on pa_readings"
  on pa_readings for select
  using (true);

-- Allow anyone (anon) to insert pa_readings (needed for input form + simulator)
create policy "Allow public insert on pa_readings"
  on pa_readings for insert
  with check (true);
