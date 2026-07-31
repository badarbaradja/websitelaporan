# FOM / ADS-B Quality Monitor — AirNav Indonesia (JATSC)

Dashboard untuk memantau kualitas data ADS-B berdasarkan nilai
**Figure of Merit (FOM)** / **Position Accuracy (PA)**, disusun sebagai
tindak lanjut dari usulan pengembangan pada laporan Kerja Praktik di Unit
Surveillance JATSC, AirNav Indonesia.

Dibangun dengan **Next.js** (App Router, TypeScript) + **Supabase** (Postgres)
+ **Tailwind CSS** + **recharts** + **lucide-react** + **PapaParse**.

---

## 1. Alur Data

Data PA **tidak** dihasilkan oleh simulator — data asli didapat dari **observasi
manual teknisi** di layar ADS-B Display, diekspor sebagai **file CSV**, lalu
**diupload** ke web ini untuk disimpan sebagai riwayat dan dianalisis.

```
Layar ADS-B → Teknisi catat → Ekspor CSV → Upload ke web → Dashboard & Analisis
```

## 2. Isi Proyek

| Direktori / File | Fungsi |
|---|---|
| `src/app/page.tsx` | Halaman dashboard utama |
| `src/app/upload/page.tsx` | Halaman upload CSV |
| `src/app/riwayat/page.tsx` | Halaman daftar riwayat upload |
| `src/app/riwayat/[id]/page.tsx` | Detail satu upload |
| `src/components/FOMDashboard.tsx` | Komponen dashboard (radar sweep, tabel, grafik, KPI, analisis) |
| `src/components/DashboardClient.tsx` | Client wrapper untuk sound controls |
| `src/components/UploadClient.tsx` | Komponen upload CSV (parse, preview, validasi, submit) |
| `src/components/AnalysisPanel.tsx` | Panel analisis (masalah pesawat & gangguan ground station) |
| `src/components/AlertToast.tsx` | Toast notification untuk alert PA ≤ 6 |
| `src/lib/supabase.ts` | Supabase client singleton |
| `src/lib/queries.ts` | Data layer (semua query ke Supabase) |
| `src/lib/playAlertSound.ts` | Web Audio API alert tones |
| `supabase/migrations/` | SQL schema & migration files |
| `supabase/seed_v2.sql` | Seed file (kosongkan data, isi lewat CSV upload) |

## 3. Skema Database Baru

### Tabel `aircraft`
| Kolom | Tipe | Keterangan |
|---|---|---|
| `aircraft_address` | text (PK) | ICAO 24-bit hex, mis. "7C4A11" |
| `registration` | text | Registrasi pesawat, mis. "B-HNH" |
| `airline` | text | Nama airline |
| `last_callsign` | text | Callsign terakhir yang tercatat |
| `created_at` | timestamptz | Waktu pertama kali tercatat |

### Tabel `uploads`
| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | uuid (PK) | Auto-generated |
| `filename` | text | Nama file CSV yang diupload |
| `observed_at` | timestamptz | Waktu pengamatan (diisi user saat upload) |
| `uploaded_at` | timestamptz | Waktu upload (otomatis) |
| `row_count` | int | Jumlah baris dalam upload |
| `notes` | text | Catatan opsional |

### Tabel `pa_readings`
| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | bigint (PK) | Auto-generated identity |
| `aircraft_address` | text (FK) | Referensi ke aircraft |
| `upload_id` | uuid (FK) | Referensi ke uploads |
| `callsign` | text | Callsign saat pengamatan |
| `pa` | smallint | Nilai PA (0-9) |
| `level` | integer | Flight level |
| `recorded_at` | timestamptz | Waktu pengamatan |

## 4. Format CSV yang Didukung

File CSV harus memiliki header berikut (case-insensitive):

| Header | Keterangan | Wajib |
|---|---|---|
| `callsign` | Callsign pesawat | Ya |
| `aircraft_address` | ICAO 24-bit hex address | Ya (tidak boleh kosong) |
| `registrasi_pesawat` | Registrasi pesawat | Tidak |
| `pa` | Nilai Position Accuracy (0-9) | Ya (harus angka 0-9) |
| `level` | Flight level | Tidak |
| `airline` | Nama airline | Tidak |

Contoh baris CSV:
```csv
callsign,aircraft_address,registrasi_pesawat,pa,level,airline
CPA332,7C4A11,B-HNH,8,350,Cathay Pacific
GIA402,76CEE8,PK-GMH,9,370,Garuda Indonesia
```

## 5. Setup

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
# Paste & Run secara berurutan:
#   supabase/migrations/004_cleanup_simulator.sql
#   supabase/migrations/005_csv_upload_schema.sql

# 4. (Opsional) Jalankan seed untuk kosongkan data
# Paste isi supabase/seed_v2.sql di SQL Editor → Run

# 5. Jalankan dev server
npm run dev
```

Buka `http://localhost:3000` — dashboard akan tampil dengan pesan
"Belum ada data — upload CSV pertama" (karena belum ada data di database).

## 6. Testing dengan File CSV Dummy

Tersedia 3 file CSV dummy untuk testing:
- `dummy_upload_sesi1_pagi.csv` — sesi pagi
- `dummy_upload_sesi2_siang.csv` — sesi siang
- `dummy_upload_sesi3_sore.csv` — sesi sore

### Cara Testing

1. Buka `http://localhost:3000/upload`
2. **Upload sesi 1 (pagi)**:
   - Set waktu pengamatan ke hari ini **08:00**
   - Pilih file `dummy_upload_sesi1_pagi.csv`
   - Periksa preview → klik "Simpan Data"
3. **Upload sesi 2 (siang)**:
   - Kembali ke /upload
   - Set waktu pengamatan ke hari ini **13:00**
   - Pilih file `dummy_upload_sesi2_siang.csv`
   - Simpan
4. **Upload sesi 3 (sore)**:
   - Kembali ke /upload
   - Set waktu pengamatan ke hari ini **17:00**
   - Pilih file `dummy_upload_sesi3_sore.csv`
   - Simpan

### Yang Harus Terlihat Setelah 3 Upload

- **Dashboard**: Tabel menampilkan semua pesawat dengan PA terbaru (dari sesi 3)
- **Grafik tren**: Klik satu pesawat → grafik menunjukkan 3 titik data (pagi, siang, sore)
- **Panel Analisis A**: CPA332 (Cathay Pacific) muncul sebagai pesawat dengan tren menurun konsisten
- **Panel Analisis B**: Sesi 3 (sore) muncul sebagai sesi dengan indikasi gangguan ground station (banyak pesawat drop bersamaan)
- **Halaman /riwayat**: 3 upload terlist dengan detail masing-masing

## 7. Toast Notification + Suara Alert

Setelah upload yang mengandung PA ≤ 6, toast notification muncul di pojok
kanan atas halaman upload. Dua jenis berdasarkan tingkat keparahan:

| Kondisi | Tone | Warna Toast | Suara |
|---|---|---|---|
| PA terendah = 6 | `warn` | Kuning (amber) | 1× beep rendah (660Hz) |
| PA terendah < 6 | `bad` | Merah | Loop double beep (880→660Hz) |

Toggle mute/unmute ada di top bar dashboard (key localStorage: `fom-alert-sound-enabled`).

## 8. Ambang Status PA

| PA | Status | Warna | Notifikasi |
|---|---|---|---|
| ≥ 9 | Sangat Baik | Hijau | — |
| 8 | Baik | Hijau | — |
| 7 | Cukup Baik | Hijau | — |
| 6 | Perlu Perhatian | Kuning | Toast ⚠️ + beep |
| < 6 | Menurun | Merah | Toast 🚨 + double beep |

## 9. Desain

- **Palet warna** — biru navy (`#0a2a66` / `#071c47`) dan putih, dengan
  aksen biru langit (`#38bdf8`) merujuk pada identitas warna AirNav Indonesia.
- **Tipografi** — Space Grotesk untuk judul, Inter untuk teks, JetBrains
  Mono untuk angka/ID pesawat.
- **Elemen signature** — visual radar sweep berputar dengan blip berwarna
  status di hero section.
