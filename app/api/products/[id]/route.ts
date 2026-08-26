import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { stock, barcode, cost_price, price, name, unit } = body

    const updates: Record<string, any> = {}
    if (stock !== undefined) updates.stock = stock
    if (barcode !== undefined) updates.barcode = barcode ? String(barcode).trim() : null
    if (cost_price !== undefined) updates.cost_price = Number(cost_price) || 0
    if (price !== undefined) updates.price = Number(price) || 0
    if (name !== undefined) updates.name = name
    if (unit !== undefined) updates.unit = unit

    const { error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Barcode ini sudah dipakai produk lain' }, { status: 409 })
      }
      throw error
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}