import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/transactions?from=2026-07-01&to=2026-07-31
export async function GET(request: NextRequest) {
  const supabase = createClient()
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
    .order('occurred_at', { ascending: false })
    .order('created_at', { ascending: false })

  if (from) query = query.gte('occurred_at', from)
  if (to) query = query.lte('occurred_at', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

// POST /api/transactions
// body: { type: 'income'|'expense', amount: number, category_id: string, note?: string, occurred_at?: string }
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  if (!body.type || !['income', 'expense'].includes(body.type)) {
    return NextResponse.json({ error: 'type harus income atau expense' }, { status: 400 })
  }
  if (!body.amount || Number(body.amount) <= 0) {
    return NextResponse.json({ error: 'amount harus lebih dari 0' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      type: body.type,
      amount: body.amount,
      category_id: body.category_id ?? null,
      note: body.note ?? null,
      occurred_at: body.occurred_at ?? new Date().toISOString().slice(0, 10),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
