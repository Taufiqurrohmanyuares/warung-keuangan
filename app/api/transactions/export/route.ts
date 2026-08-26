import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  
  // Ambil semua transaksi beserta nama kategorinya, urutkan dari yang terbaru
  const { data, error } = await supabase
    .from('transactions')
    .select('id, type, amount, note, occurred_at, categories(name)')
    .eq('is_voided', false)
    .order('occurred_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Siapkan baris pertama (Header CSV)
  let csv = 'Tanggal,Tipe,Kategori,Nominal,Catatan\n'
  
  // Looping data transaksi menjadi format CSV
  data?.forEach(row => {
    const date = row.occurred_at
    const type = row.type === 'income' ? 'Pemasukan' : 'Pengeluaran'
    // Cek apakah ada relasi kategori, jika tidak pakai tanda strip
    const category = (row.categories as any)?.name || '-'
    const amount = row.amount
    // Hapus koma pada catatan agar tidak merusak format kolom CSV
    const note = row.note ? row.note.replace(/,/g, ' ') : '-'
    
    csv += `${date},${type},${category},${amount},${note}\n`
  })

  // Set HTTP Headers agar peramban langsung mengunduhnya sebagai file CSV
  const headers = new Headers()
  headers.set('Content-Type', 'text/csv')
  headers.set('Content-Disposition', 'attachment; filename=riwayat_transaksi_warung.csv')

  return new NextResponse(csv, { status: 200, headers })
}