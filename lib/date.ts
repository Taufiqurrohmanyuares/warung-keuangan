// Semua perhitungan "tanggal hari ini" di app ini WAJIB lewat sini.
// Alasan: `new Date().toISOString().slice(0, 10)` di JS SELALU pakai UTC,
// dan `current_date` di Postgres (Supabase) juga default UTC. Warung ini
// di Indonesia (WIB = UTC+7), jadi transaksi yang terjadi jam 00:00–06:59 WIB
// bakal kehitung sebagai tanggal KEMARIN kalau pakai cara biasa. Ini krusial
// buat akurasi Tutup Kasir & laporan harian.

/** Tanggal hari ini di WIB, format YYYY-MM-DD */
export function todayWIB(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
}

/** Rentang tanggal 1 bulan penuh (format YYYY-MM-DD), aman dari pergeseran zona waktu
 *  karena murni kalkulasi kalender (tidak menyentuh timezone lokal device/server). */
export function monthRangeStr(year: number, month: number): { from: string; to: string } {
  // month: 1-12
  const pad = (n: number) => String(n).padStart(2, '0')
  const from = `${year}-${pad(month)}-01`
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const to = `${year}-${pad(month)}-${pad(lastDay)}`
  return { from, to }
}
