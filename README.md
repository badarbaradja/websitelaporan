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
| `supabase/migrations/` | SQL schema + RLS policies |
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

## 4. Simulator (untuk demo)

Simulator secara otomatis meng-insert data PA baru secara berkala (setiap
5–8 detik) ke Supabase, membuat dashboard terasa "hidup" saat presentasi
tanpa harus isi form manual terus-menerus.

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

Saat PA turun ke < 6, toast notification merah muncul otomatis di pojok
kanan atas dashboard (via Supabase Realtime). Tekan `Ctrl+C` untuk
menghentikan simulator.

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
