-- ============================================================
-- FOM / ADS-B Quality Monitor — Seed Data
-- 8 target dummy dari FOMDashboard.jsx + history PA masing-masing
-- ============================================================

-- Insert target pesawat
insert into targets (id, flag, country, params, note) values
  ('UBA1',            '🇲🇲', 'Myanmar',                '{"AC": 0, "MN": 0, "DC": 0, "Vel. Accuracy": 0, "GBS": 0}'::jsonb,                       'Kualitas cukup baik'),
  ('AXM5199',         '🇲🇾', 'Malaysia',               '{"AC": 0, "MN": 0, "DC": 0, "Vel. Accuracy": 0, "GBS": 0}'::jsonb,                       'Kualitas mulai menurun, perlu pemantauan lanjut'),
  ('UNIDENTIFIED-03', '🏳️', 'Tidak teridentifikasi',  '{"AC": 0, "MN": 0, "DC": 0, "Emitter Cat.": 21, "GBS": 1}'::jsonb,                       'Kualitas baik'),
  ('UNIDENTIFIED-04', '🏳️', 'Tidak teridentifikasi',  '{"AC": 0, "MN": 0, "DC": 0, "GBS": 1, "TST": 1, "RAB": 1}'::jsonb,                      'Kualitas sangat baik'),
  ('GIA402',          '🇮🇩', 'Indonesia',              '{"AC": 0, "MN": 0, "DC": 0, "GBS": 1, "Vel. Accuracy": 0}'::jsonb,                       'Kualitas sangat baik, posisi stabil'),
  ('SIA912',          '🇸🇬', 'Singapura',              '{"AC": 0, "MN": 0, "DC": 0, "GBS": 0, "Vel. Accuracy": 1}'::jsonb,                       'Kualitas baik'),
  ('AWQ218',          '🇹🇭', 'Thailand',               '{"AC": 0, "MN": 1, "DC": 0, "GBS": 0}'::jsonb,                                          'Kualitas cukup baik'),
  ('CPA332',          '🇭🇰', 'Hong Kong',              '{"AC": 1, "MN": 0, "DC": 0, "GBS": 0, "Vel. Accuracy": 1}'::jsonb,                       'Kualitas menurun signifikan, berpotensi intermittent target');

-- Insert history PA untuk tiap target
-- Setiap target punya 8 pembacaan (sesuai TIME_LABELS: -35m, -30m, -25m, -20m, -15m, -10m, -5m, now)
-- Timestamp di-offset mundur dari waktu saat seed dijalankan

-- UBA1: history [7, 8, 7, 7, 6, 7, 7, 7]
insert into pa_readings (target_id, pa, recorded_at, recorded_by) values
  ('UBA1', 7, now() - interval '35 minutes', 'seed'),
  ('UBA1', 8, now() - interval '30 minutes', 'seed'),
  ('UBA1', 7, now() - interval '25 minutes', 'seed'),
  ('UBA1', 7, now() - interval '20 minutes', 'seed'),
  ('UBA1', 6, now() - interval '15 minutes', 'seed'),
  ('UBA1', 7, now() - interval '10 minutes', 'seed'),
  ('UBA1', 7, now() - interval '5 minutes',  'seed'),
  ('UBA1', 7, now(),                          'seed');

-- AXM5199: history [8, 7, 7, 6, 6, 7, 6, 6]
insert into pa_readings (target_id, pa, recorded_at, recorded_by) values
  ('AXM5199', 8, now() - interval '35 minutes', 'seed'),
  ('AXM5199', 7, now() - interval '30 minutes', 'seed'),
  ('AXM5199', 7, now() - interval '25 minutes', 'seed'),
  ('AXM5199', 6, now() - interval '20 minutes', 'seed'),
  ('AXM5199', 6, now() - interval '15 minutes', 'seed'),
  ('AXM5199', 7, now() - interval '10 minutes', 'seed'),
  ('AXM5199', 6, now() - interval '5 minutes',  'seed'),
  ('AXM5199', 6, now(),                          'seed');

-- UNIDENTIFIED-03: history [9, 8, 8, 9, 8, 8, 7, 8]
insert into pa_readings (target_id, pa, recorded_at, recorded_by) values
  ('UNIDENTIFIED-03', 9, now() - interval '35 minutes', 'seed'),
  ('UNIDENTIFIED-03', 8, now() - interval '30 minutes', 'seed'),
  ('UNIDENTIFIED-03', 8, now() - interval '25 minutes', 'seed'),
  ('UNIDENTIFIED-03', 9, now() - interval '20 minutes', 'seed'),
  ('UNIDENTIFIED-03', 8, now() - interval '15 minutes', 'seed'),
  ('UNIDENTIFIED-03', 8, now() - interval '10 minutes', 'seed'),
  ('UNIDENTIFIED-03', 7, now() - interval '5 minutes',  'seed'),
  ('UNIDENTIFIED-03', 8, now(),                          'seed');

-- UNIDENTIFIED-04: history [9, 9, 8, 9, 9, 9, 9, 9]
insert into pa_readings (target_id, pa, recorded_at, recorded_by) values
  ('UNIDENTIFIED-04', 9, now() - interval '35 minutes', 'seed'),
  ('UNIDENTIFIED-04', 9, now() - interval '30 minutes', 'seed'),
  ('UNIDENTIFIED-04', 8, now() - interval '25 minutes', 'seed'),
  ('UNIDENTIFIED-04', 9, now() - interval '20 minutes', 'seed'),
  ('UNIDENTIFIED-04', 9, now() - interval '15 minutes', 'seed'),
  ('UNIDENTIFIED-04', 9, now() - interval '10 minutes', 'seed'),
  ('UNIDENTIFIED-04', 9, now() - interval '5 minutes',  'seed'),
  ('UNIDENTIFIED-04', 9, now(),                          'seed');

-- GIA402: history [8, 9, 9, 9, 9, 9, 9, 9]
insert into pa_readings (target_id, pa, recorded_at, recorded_by) values
  ('GIA402', 8, now() - interval '35 minutes', 'seed'),
  ('GIA402', 9, now() - interval '30 minutes', 'seed'),
  ('GIA402', 9, now() - interval '25 minutes', 'seed'),
  ('GIA402', 9, now() - interval '20 minutes', 'seed'),
  ('GIA402', 9, now() - interval '15 minutes', 'seed'),
  ('GIA402', 9, now() - interval '10 minutes', 'seed'),
  ('GIA402', 9, now() - interval '5 minutes',  'seed'),
  ('GIA402', 9, now(),                          'seed');

-- SIA912: history [9, 8, 9, 8, 8, 9, 8, 8]
insert into pa_readings (target_id, pa, recorded_at, recorded_by) values
  ('SIA912', 9, now() - interval '35 minutes', 'seed'),
  ('SIA912', 8, now() - interval '30 minutes', 'seed'),
  ('SIA912', 9, now() - interval '25 minutes', 'seed'),
  ('SIA912', 8, now() - interval '20 minutes', 'seed'),
  ('SIA912', 8, now() - interval '15 minutes', 'seed'),
  ('SIA912', 9, now() - interval '10 minutes', 'seed'),
  ('SIA912', 8, now() - interval '5 minutes',  'seed'),
  ('SIA912', 8, now(),                          'seed');

-- AWQ218: history [7, 7, 8, 7, 6, 7, 7, 7]
insert into pa_readings (target_id, pa, recorded_at, recorded_by) values
  ('AWQ218', 7, now() - interval '35 minutes', 'seed'),
  ('AWQ218', 7, now() - interval '30 minutes', 'seed'),
  ('AWQ218', 8, now() - interval '25 minutes', 'seed'),
  ('AWQ218', 7, now() - interval '20 minutes', 'seed'),
  ('AWQ218', 6, now() - interval '15 minutes', 'seed'),
  ('AWQ218', 7, now() - interval '10 minutes', 'seed'),
  ('AWQ218', 7, now() - interval '5 minutes',  'seed'),
  ('AWQ218', 7, now(),                          'seed');

-- CPA332: history [9, 8, 8, 7, 6, 6, 5, 5]
insert into pa_readings (target_id, pa, recorded_at, recorded_by) values
  ('CPA332', 9, now() - interval '35 minutes', 'seed'),
  ('CPA332', 8, now() - interval '30 minutes', 'seed'),
  ('CPA332', 8, now() - interval '25 minutes', 'seed'),
  ('CPA332', 7, now() - interval '20 minutes', 'seed'),
  ('CPA332', 6, now() - interval '15 minutes', 'seed'),
  ('CPA332', 6, now() - interval '10 minutes', 'seed'),
  ('CPA332', 5, now() - interval '5 minutes',  'seed'),
  ('CPA332', 5, now(),                          'seed');
