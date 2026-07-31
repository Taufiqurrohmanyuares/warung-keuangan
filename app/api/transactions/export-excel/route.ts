import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'

export async function GET(request: NextRequest) {
  // PERBAIKAN: Tambahkan 'await' di sini karena createClient di server (App Router) bersifat asynchronous
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()
  
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let query = supabase
    .from('transactions')
    .select('*, categories(name)')
    .eq('user_id', user.id)
    .order('occurred_at', { ascending: true })

  if (from) query = query.gte('occurred_at', from)
  if (to) query = query.lte('occurred_at', to)

  const { data: transactions, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // ===== Susun workbook Excel =====
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Buku Warung'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Riwayat Transaksi', {
    views: [{ state: 'frozen', ySplit: 1 }], // baris header selalu kelihatan saat scroll
  })

  sheet.columns = [
    { header: 'Tanggal', key: 'tanggal', width: 14 },
    { header: 'Tipe', key: 'tipe', width: 14 },
    { header: 'Kategori', key: 'kategori', width: 22 },
    { header: 'Catatan', key: 'catatan', width: 30 },
    { header: 'Nominal (Rp)', key: 'nominal', width: 18 },
  ]

  // Styling header
  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B4FE5' } }
  headerRow.alignment = { vertical: 'middle' }
  headerRow.height = 22

  let totalIncome = 0
  let totalExpense = 0

  for (const t of transactions || []) {
    const isIncome = t.type === 'income'
    if (isIncome) totalIncome += Number(t.amount)
    else totalExpense += Number(t.amount)

    // Perbaikan pengetikan opsional untuk relasi tabel categories agar TypeScript tidak rewel
    const categoryName = (t.categories as any)?.name ?? '-'

    const row = sheet.addRow({
      tanggal: new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(t.occurred_at)),
      tipe: isIncome ? 'Pemasukan' : 'Pengeluaran',
      kategori: categoryName,
      catatan: t.note ?? '-',
      nominal: Number(t.amount),
    })

    row.getCell('nominal').numFmt = '#,##0'
    row.getCell('nominal').alignment = { horizontal: 'right' }
    row.getCell('tipe').font = { color: { argb: isIncome ? 'FF16A34A' : 'FFDC2626' }, bold: true }
  }

  // Baris kosong pemisah
  sheet.addRow([])

  // Baris ringkasan
  const summaryStartRow = sheet.rowCount + 1

  const rowIncome = sheet.addRow({ kategori: 'Total Pemasukan', nominal: totalIncome })
  rowIncome.getCell('kategori').font = { bold: true }
  rowIncome.getCell('nominal').font = { bold: true, color: { argb: 'FF16A34A' } }
  rowIncome.getCell('nominal').numFmt = '#,##0'
  rowIncome.getCell('nominal').alignment = { horizontal: 'right' }

  const rowExpense = sheet.addRow({ kategori: 'Total Pengeluaran', nominal: totalExpense })
  rowExpense.getCell('kategori').font = { bold: true }
  rowExpense.getCell('nominal').font = { bold: true, color: { argb: 'FFDC2626' } }
  rowExpense.getCell('nominal').numFmt = '#,##0'
  rowExpense.getCell('nominal').alignment = { horizontal: 'right' }

  const rowNet = sheet.addRow({ kategori: 'Saldo Bersih', nominal: totalIncome - totalExpense })
  rowNet.getCell('kategori').font = { bold: true }
  rowNet.getCell('nominal').font = { bold: true, color: { argb: 'FF5B4FE5' } }
  rowNet.getCell('nominal').numFmt = '#,##0'
  rowNet.getCell('nominal').alignment = { horizontal: 'right' }

  // Garis atas pemisah ringkasan
  sheet.getRow(summaryStartRow).border = { top: { style: 'thin', color: { argb: 'FFDCD3C0' } } }

  const buffer = await workbook.xlsx.writeBuffer()

  const today = new Date().toISOString().slice(0, 10)

  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="riwayat-transaksi-${today}.xlsx"`,
    },
  })
}