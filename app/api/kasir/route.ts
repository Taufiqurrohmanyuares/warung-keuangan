import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type CartItem = { product_id: string; name: string; qty: number; price: number }

export async function POST(request: NextRequest) {
  try {
    // PERBAIKAN: Tambahkan 'await' karena createClient di server membutuhkan proses asinkron untuk baca cookies
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const items: CartItem[] = body.items

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Keranjang kosong' }, { status: 400 })
    }

    const total = items.reduce((sum, i) => sum + i.qty * i.price, 0)
    const note = items.map((i) => `${i.name} x${i.qty}`).join(', ')

    const { data, error } = await supabase.rpc('checkout_kasir', {
      p_user_id: user.id,
      p_items: items.map((i) => ({ product_id: i.product_id, qty: i.qty })),
      p_total: total,
      p_note: note,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, transaction_id: data })
  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan pada server saat checkout' }, { status: 500 })
  }
}