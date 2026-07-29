# FOM / ADS-B Quality Monitor — AirNav Indonesia (JATSC)

Dashboard untuk memantau kualitas data ADS-B berdasarkan nilai
**Figure of Merit (FOM)** / **Position Accuracy (PA)**, disusun sebagai
tindak lanjut dari usulan pengembangan pada laporan Kerja Praktik di Unit
Surveillance JATSC, AirNav Indonesia.

Dibangun dengan **Next.js** (App Router, TypeScript) + **Supabase** (Postgres,
Realtime) + **Tailwind CSS** + **recharts** + **lucide-react**.

---

## 1. Isi proyek

| Direktori / File | Fungsi |
|---|---|
| `src/app/page.tsx` | Halaman dashboard utama |
| `src/app/input/page.tsx` | Halaman input PA manual |
| `src/components/FOMDashboard.tsx` | Komponen dashboard (radar sweep, tabel, grafik, KPI) |
| `src/components/DashboardClient.tsx` | Client wrapper + Supabase Realtime subscription + toast state |
| `src/components/AlertToast.tsx` | Toast notification untuk alert PA < 6 |
| `src/lib/supabase.ts` | Supabase client singleton |
| `src/lib/queries.ts` | Data layer (getTargets, addPaReading, dst.) |
| `supabase/migrations/` | SQL schema, RLS policies, pg_cron simulator |
| `supabase/seed.sql` | Data awal (8 target + 64 PA readings) |
| `scripts/simulate.mjs` | Simulator PA — insert data acak untuk demo |
| `FOMDashboard.jsx` | Prototipe asli (referensi, tidak dipakai lagi) |

## 2. Setup

### Prasyarat
- Node.js ≥ 20
- Akun Supabase (gratis)

### Langkah

```bash
# 1. Install dependencies
npm install

# 2. Copy dan isi environment variables
cp .env.local.example .env.local
# Edit .env.local, isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. Jalankan migration SQL
# Buka Supabase Dashboard → SQL Editor → New query
# Paste isi supabase/migrations/001_create_tables.sql → Run
# Paste isi supabase/migrations/002_rls_policies.sql → Run
# Paste isi supabase/migrations/003_pg_cron_simulator.sql → Run  (simulator otomatis)

# 4. Jalankan seed data
# Paste isi supabase/seed.sql di SQL Editor → Run

# 5. Aktifkan Realtime
# Supabase Dashboard → Database → Replication → centang tabel pa_readings

# 6. Jalankan dev server
npm run dev
```

Buka `http://localhost:3000` — dashboard harus tampil dengan data dari Supabase.

## 3. Halaman Input

Buka `http://localhost:3000/input` untuk mencatat nilai PA secara manual.
Form ini mensimulasikan petugas yang membaca nilai PA dari layar Intelcan
ADS-B Display dan mencatatnya ke sistem.

## 4. Simulator PA

Ada **dua cara** menjalankan simulator — pilih sesuai kebutuhan:

### 4a. Server-side (pg_cron) — ✅ Direkomendasikan

Simulator jalan **otomatis di server Supabase** setiap **1 menit**, tanpa
perlu laptop menyala. Data PA terus terisi 24/7 selama cron job aktif.

**Setup sekali:**
```bash
# Paste isi file berikut di Supabase Dashboard → SQL Editor → Run:
supabase/migrations/003_pg_cron_simulator.sql
```

Setelah dijalankan, function `simulate_pa_tick()` terjadwal via pg_cron.
Setiap menit, satu target dipilih acak dan PA-nya diupdate menggunakan
random walk (sama persis dengan logic di `scripts/simulate.mjs`).

- `recorded_by` diisi `'Simulator (cron)'` agar mudah dibedakan dari
  input manual atau simulator lokal.
- pg_cron berjalan sebagai role `postgres` (bukan `anon`), sehingga
  **RLS tidak menghalangi** insert-nya.

> **Catatan:** pg_cron minimum interval = 1 menit. Untuk update lebih
> cepat, gunakan simulator lokal di bawah.

### 4b. Simulator lokal (untuk demo cepat)

Untuk presentasi langsung yang butuh data berubah setiap 5–8 detik
(lebih cepat dari cron), jalankan simulator lokal:

```bash
# Terminal 1 — dev server (kalau belum jalan)
npm run dev

# Terminal 2 — simulator
npm run simulate
```

Output simulator di terminal:
```
╔═══════════════════════════════════════════════════╗
║   FOM Simulator — ADS-B PA Random Walk           ║
║   Insert baru setiap 5–8 detik                   ║
║   Tekan Ctrl+C untuk berhenti                    ║
╚═══════════════════════════════════════════════════╝

[12:03:41] 🇭🇰 CPA332 (Hong Kong) : 7 → 5 ⚠️
[12:03:47] 🇮🇩 GIA402 (Indonesia) : 9 → 8
[12:03:53] 🇲🇲 UBA1 (Myanmar) : 7 → 6
```

Tekan `Ctrl+C` untuk menghentikan.

> **Tips:** Kamu bisa jalankan keduanya bersamaan — cron job sebagai
> baseline 1 menit, dan simulator lokal untuk burst data saat demo.

### 4c. Menonaktifkan / mengaktifkan kembali cron job

Kalau sewaktu-waktu ingin **menghentikan** simulator server-side, jalankan
SQL berikut di Supabase SQL Editor:

```sql
-- Hentikan cron job
select cron.unschedule('simulate-pa-tick');
```

Untuk **mengaktifkan kembali:**

```sql
-- Aktifkan kembali cron job (1 menit interval)
select cron.schedule(
  'simulate-pa-tick',
  '* * * * *',
  $$select public.simulate_pa_tick()$$
);
```

Untuk **melihat daftar cron job** yang aktif:

```sql
select jobid, jobname, schedule, command from cron.job;
```

## 5. Toast Notification

Setiap kali ada PA reading baru dengan nilai < 6, toast merah muncul di
pojok kanan atas dashboard:
- **Auto-dismiss** setelah 6 detik
- **Stackable** — beberapa toast bisa muncul bersamaan
- **Manual close** — klik ikon × untuk menutup lebih awal
- Animasi slide-in dari kanan + slide-out saat hilang

## 6. Ambang status PA

| PA | Status | Warna |
|---|---|---|
| ≥ 9 | Sangat Baik | Hijau |
| 8 | Baik | Hijau |
| 7 | Cukup Baik | Hijau |
| 6 | Perlu Perhatian | Kuning |
| < 6 | Menurun | Merah + Toast ⚠️ |

## 7. Desain

- **Palet warna** — biru navy (`#0a2a66` / `#071c47`) dan putih, dengan
  aksen biru langit (`#38bdf8`) merujuk pada identitas warna AirNav Indonesia.
- **Tipografi** — Space Grotesk untuk judul, Inter untuk teks, JetBrains
  Mono untuk angka/ID pesawat.
- **Elemen signature** — visual radar sweep berputar dengan blip berwarna
  status di hero section.
