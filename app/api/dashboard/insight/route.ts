import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { todayWIB, monthRangeStr } from '@/lib/date'

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

// GET /api/dashboard/insight?month=2026-08
// Menghasilkan ringkasan naratif (Bahasa Indonesia) dari data keuangan bulan tsb, pakai Gemini.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY belum diatur di server. Tambahkan dulu di file .env / pengaturan environment variable.' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month')
    const [yearStr, monthStr] = (monthParam || todayWIB().slice(0, 7)).split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)
    const { from, to } = monthRangeStr(year, month)

    // Bulan sebelumnya, buat bahan perbandingan tren
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    const { from: prevFrom, to: prevTo } = monthRangeStr(prevYear, prevMonth)

    const [{ data: currentTx }, { data: prevTx }] = await Promise.all([
      supabase
        .from('transactions')
        .select('id, type, amount')
        .eq('user_id', user.id)
        .eq('is_voided', false)
        .gte('occurred_at', from)
        .lte('occurred_at', to),
      supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', user.id)
        .eq('is_voided', false)
        .gte('occurred_at', prevFrom)
        .lte('occurred_at', prevTo),
    ])

    let totalIncome = 0
    let totalExpense = 0
    currentTx?.forEach((t) => {
      if (t.type === 'income') totalIncome += Number(t.amount)
      else totalExpense += Number(t.amount)
    })

    let prevIncome = 0
    let prevExpense = 0
    prevTx?.forEach((t) => {
      if (t.type === 'income') prevIncome += Number(t.amount)
      else prevExpense += Number(t.amount)
    })

    const netProfit = totalIncome - totalExpense
    const prevNetProfit = prevIncome - prevExpense

    // Barang paling laku bulan ini (dari transaction_items, kalau transaksinya dari kasir)
    const incomeIds = (currentTx || []).filter((t) => t.type === 'income').map((t) => t.id)
    let topProducts: { name: string; qty: number }[] = []

    if (incomeIds.length > 0) {
      const { data: items } = await supabase
        .from('transaction_items')
        .select('product_name, qty')
        .in('transaction_id', incomeIds)

      const salesByProduct: Record<string, number> = {}
      for (const it of items || []) {
        salesByProduct[it.product_name] = (salesByProduct[it.product_name] || 0) + Number(it.qty)
      }
      topProducts = Object.entries(salesByProduct)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, qty]) => ({ name, qty }))
    }

    if ((currentTx || []).length === 0) {
      return NextResponse.json({
        narrative: 'Belum ada transaksi yang tercatat di bulan ini, jadi belum bisa dibuatkan ringkasan. Coba lagi setelah ada beberapa transaksi masuk, ya.',
      })
    }

    const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(
      new Date(year, month - 1, 1)
    )

    const prompt = `Kamu adalah asisten keuangan yang membantu pemilik warung kecil di Indonesia memahami kondisi usahanya.
Berdasarkan data di bawah, tulis ringkasan singkat (3-4 kalimat saja) dalam Bahasa Indonesia yang santai dan mudah dipahami orang awam (bukan bahasa akuntansi formal). Tulis sebagai paragraf mengalir, JANGAN pakai markdown, bullet point, atau heading.

Data keuangan warung bulan ${monthLabel}:
- Total pemasukan: ${formatRupiah(totalIncome)}
- Total pengeluaran: ${formatRupiah(totalExpense)}
- Untung bersih: ${formatRupiah(netProfit)}
- Untung bersih bulan lalu (pembanding): ${formatRupiah(prevNetProfit)}
- Barang paling laku: ${topProducts.length > 0 ? topProducts.map((p) => `${p.name} (${p.qty} terjual)`).join(', ') : 'belum ada data penjualan barang'}

Sebutkan tren untung dibanding bulan lalu (naik/turun, kira-kira berapa persen), sebutkan barang paling laris kalau ada datanya, dan tutup dengan satu saran praktis singkat yang relevan buat pemilik warung.`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
        },
        }),
      }
    )

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      console.error('Gemini API error:', errText)
      return NextResponse.json({ error: 'Gagal membuat ringkasan AI. Coba lagi sebentar lagi.' }, { status: 502 })
    }

    const geminiData = await geminiRes.json()
    const parts = geminiData?.candidates?.[0]?.content?.parts || []
    const narrative: string =
      parts.map((p: any) => p.text || '').join('').trim() ||
      'Ringkasan tidak tersedia saat ini, coba lagi.'

    return NextResponse.json({ narrative, month: monthLabel })
  } catch (error: any) {
    console.error('Insight error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan saat membuat ringkasan' }, { status: 500 })
  }
}