import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { todayWIB } from '@/lib/date'

// GET: Ringkasan kas untuk tanggal tertentu (default hari ini) + riwayat penutupan terakhir
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || todayWIB()

    // Kalau tanggal ini sudah pernah ditutup, langsung kembalikan datanya
    const { data: existingClosing } = await supabase
      .from('cash_closings')
      .select('*')
      .eq('user_id', user.id)
      .eq('closing_date', date)
      .maybeSingle()

    // Total transaksi hari itu, dipecah per metode bayar (kecuali yang sudah dibatalkan)
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('type, amount, payment_method')
      .eq('user_id', user.id)
      .eq('occurred_at', date)
      .eq('is_voided', false)

    if (txError) throw txError

    const cashSales = (transactions || [])
      .filter((t) => t.type === 'income' && (t.payment_method || 'cash') === 'cash')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const qrisSales = (transactions || [])
      .filter((t) => t.type === 'income' && t.payment_method === 'qris')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const cashExpenses = (transactions || [])
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    // Modal kas awal default = uang hasil hitung dari penutupan sebelumnya (kalau ada)
    const { data: lastClosing } = await supabase
      .from('cash_closings')
      .select('counted_cash, closing_date')
      .eq('user_id', user.id)
      .lt('closing_date', date)
      .order('closing_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({
      date,
      already_closed: !!existingClosing,
      closing: existingClosing || null,
      suggested_opening_cash: lastClosing?.counted_cash ?? 0,
      cash_sales: cashSales,
      qris_sales: qrisSales,
      cash_expenses: cashExpenses,
      transaction_count: (transactions || []).length,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Simpan penutupan kasir untuk tanggal tertentu
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const date: string = body.date || todayWIB()
    const openingCash = Number(body.opening_cash) || 0
    const countedCash = Number(body.counted_cash) || 0
    const cashSales = Number(body.cash_sales) || 0
    const qrisSales = Number(body.qris_sales) || 0
    const cashExpenses = Number(body.cash_expenses) || 0
    const transactionCount = Number(body.transaction_count) || 0
    const note: string | null = body.note?.trim() || null

    const expectedCash = openingCash + cashSales - cashExpenses
    const difference = countedCash - expectedCash

    const { data, error } = await supabase
      .from('cash_closings')
      .insert([{
        user_id: user.id,
        closing_date: date,
        opening_cash: openingCash,
        cash_sales: cashSales,
        qris_sales: qrisSales,
        cash_expenses: cashExpenses,
        expected_cash: expectedCash,
        counted_cash: countedCash,
        difference,
        transaction_count: transactionCount,
        note,
      }])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Tanggal ini sudah pernah ditutup. Buka lagi dulu kalau mau ubah.' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Buka lagi penutupan (kalau kasir salah input dan mau ulang)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    if (!date) return NextResponse.json({ error: 'Tanggal wajib diisi' }, { status: 400 })

    const { error } = await supabase
      .from('cash_closings')
      .delete()
      .eq('user_id', user.id)
      .eq('closing_date', date)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}