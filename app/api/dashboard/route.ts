import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { todayWIB, monthRangeStr } from '@/lib/date'

function getMonthRange(monthParam: string | null) {
  // monthParam format: "2026-07". Kalau tidak ada, pakai bulan berjalan (WIB).
  const [yearStr, monthStr] = (monthParam || todayWIB().slice(0, 7)).split('-')
  return monthRangeStr(Number(yearStr), Number(monthStr))
}

export async function GET(request: NextRequest) {
  try {
    // PERBAIKAN: Tambahkan 'await' di sini karena createClient di server (App Router) bersifat asynchronous
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month') // format "2026-07"
    const { from, to } = getMonthRange(monthParam)

    // 1. Ambil transaksi HANYA di bulan yang dipilih
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_voided', false)
      .gte('occurred_at', from)
      .lte('occurred_at', to)
      .order('occurred_at', { ascending: false })

    // 2. Piutang kasbon = snapshot utang aktif SAAT INI (bukan per bulan, karena kasbon adalah status berjalan)
    const { data: debts } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'paid')

    let totalIncome = 0
    let totalExpense = 0

    transactions?.forEach((t) => {
      const amount = Number(t.amount || 0)
      if (t.type === 'income') totalIncome += amount
      else if (t.type === 'expense') totalExpense += amount
    })

    let totalDebtRemaining = 0
    debts?.forEach((d) => {
      const remaining = Number(d.amount || 0) - Number(d.paid_amount || 0)
      totalDebtRemaining += remaining
    })

    const netProfit = totalIncome - totalExpense

    return NextResponse.json({
      totalIncome,
      totalExpense,
      netProfit,
      totalDebtRemaining,
      recentTransactions: transactions?.slice(0, 5) || [],
      month: monthParam || todayWIB().slice(0, 7),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}