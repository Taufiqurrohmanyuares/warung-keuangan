# Catatan Keuangan Warung

Aplikasi sederhana untuk pemilik warung/toko kecil mencatat pemasukan & pengeluaran harian.

## Fitur di scaffold ini
- ✅ Auth (register/login) pakai Supabase
- ✅ Kategori default otomatis dibuat saat user daftar
- ✅ CRUD transaksi (tambah, lihat, hapus)
- ✅ Dashboard ringkasan hari ini + grafik 30 hari
- ✅ Route protection (middleware)
- ⬜ Filter periode custom & export laporan (belum, lihat bagian "Langkah selanjutnya")

## Setup

### 1. Buat project Supabase
1. Daftar/login di https://supabase.com
2. Buat project baru (pilih region Singapore biar latency rendah dari Indonesia)
3. Buka **SQL Editor** > jalankan isi file `supabase/schema.sql` di repo ini
4. Buka **Project Settings > API**, salin `Project URL` dan `anon public key`

### 2. Setup environment variable
```bash
cp .env.local.example .env.local
```
Isi `.env.local` dengan URL dan anon key dari langkah sebelumnya.

### 3. Install dependency & jalankan
```bash
npm install
npm run dev
```
Buka http://localhost:3000

### 4. (Opsional) Matikan email confirmation saat development
Di Supabase Dashboard > Authentication > Providers > Email, matikan "Confirm email" biar bisa langsung login setelah daftar tanpa cek email dulu. Nyalakan lagi kalau sudah mau production.

## Struktur folder penting
```
app/
  login/page.tsx         - halaman login & register
  dashboard/page.tsx      - ringkasan + grafik
  transactions/page.tsx   - form input & riwayat transaksi
  api/transactions/       - REST API CRUD transaksi
  api/categories/         - REST API kategori
lib/supabase/             - client Supabase (browser & server)
supabase/schema.sql        - schema database + RLS policy
middleware.ts              - proteksi halaman yang butuh login
```

## Langkah selanjutnya (v2)
1. **Filter periode** di halaman transaksi (hari ini / minggu ini / bulan ini / custom range) — tinggal manfaatkan query param `from` & `to` yang sudah didukung di `GET /api/transactions`.
2. **Export laporan** ke PDF/Excel (bisa pakai library seperti `jspdf` atau `exceljs`).
3. **Manajemen kategori** — halaman untuk tambah/edit/hapus kategori sendiri (API `POST /api/categories` sudah tersedia).
4. **Multi-user per toko** — kalau owner mau kasih akses ke karyawan, perlu tabel `store_members` dan aturan RLS tambahan.
5. **Deploy ke Vercel** — hubungkan repo GitHub ke Vercel, isi environment variable yang sama seperti `.env.local`.

## Catatan keamanan
Row Level Security (RLS) sudah diaktifkan di schema, jadi setiap user hanya bisa lihat & ubah data miliknya sendiri di level database — bukan cuma di level aplikasi. Ini penting supaya data toko satu tidak bisa diakses toko lain walau ada bug di kode frontend.
