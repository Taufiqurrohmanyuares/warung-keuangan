import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: Ambil daftar produk (opsional ?barcode=xxx untuk cari 1 produk lewat scan)
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const barcode = searchParams.get('barcode')

    let query = supabase.from('products').select('*').eq('user_id', user.id)

    if (barcode) {
      const { data, error } = await query.eq('barcode', barcode).maybeSingle()
      if (error) throw error
      if (!data) return NextResponse.json({ error: 'Barcode tidak dikenali' }, { status: 404 })
      return NextResponse.json(data)
    }

    const { data, error } = await query.order('name')
    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Tambah produk baru
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { name, stock, unit, price, barcode, cost_price } = body

    const { data, error } = await supabase
      .from('products')
      .insert([{
        user_id: user.id,
        name,
        stock: Number(stock),
        unit,
        price: Number(price),
        barcode: barcode ? String(barcode).trim() : null,
        cost_price: cost_price ? Number(cost_price) : 0,
      }])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Barcode ini sudah dipakai produk lain' }, { status: 409 })
      }
      throw error
    }
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Hapus produk
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}