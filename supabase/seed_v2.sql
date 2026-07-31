-- ============================================================
-- Seed v2 — Kosongkan data lama
-- Data baru diisi melalui upload 3 file CSV dummy:
--   1. dummy_upload_sesi1_pagi.csv   (waktu pengamatan: pagi, mis. 08:00)
--   2. dummy_upload_sesi2_siang.csv  (waktu pengamatan: siang, mis. 13:00)
--   3. dummy_upload_sesi3_sore.csv   (waktu pengamatan: sore, mis. 17:00)
--
-- Upload berurutan supaya grafik tren PA menunjukkan
-- perubahan kronologis yang logis.
-- ============================================================

truncate pa_readings cascade;
truncate uploads cascade;
truncate aircraft cascade;
