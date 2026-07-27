import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Ambil semua transaksi user
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)

    // 2. Ambil semua kasbon user yang belum lunas (status != 'paid')
    const { data: debts } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'paid')

    // 3. Hitung Total Pemasukan & Pengeluaran
    let totalIncome = 0
    let totalExpense = 0

    transactions?.forEach((t) => {
      const amount = Number(t.amount || 0)
      if (t.type === 'income') totalIncome += amount
      else if (t.type === 'expense') totalExpense += amount
    })

    // 4. Hitung Total Sisa Kasbon yang belum dibayar
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
      recentTransactions: transactions?.slice(0, 5) || [], // 5 transaksi terakhir untuk grafik/tabel ringkas
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}