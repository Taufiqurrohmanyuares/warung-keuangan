'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createDebt(formData: any) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Sesi Anda telah berakhir, silakan login kembali.' }
    }

    const { error } = await supabase
      .from('debts')
      .insert([{
        user_id: user.id,
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone || null,
        amount: formData.amount,
        paid_amount: 0, // Awal pinjam, yang dibayar otomatis 0
        status: 'unpaid', // Status awal otomatis belum bayar
        due_date: formData.due_date || null,
        notes: formData.notes || null,
      }])

    if (error) throw new Error(error.message)

    revalidatePath('/debts')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Terjadi kesalahan pada server' }
  }
}

// Fungsi bayar cicilan — atomik lewat RPC: update kasbon + catat transaksi pemasukan sekaligus.
export async function payDebt(debtId: string, paymentAmount: number) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Sesi habis, silakan login ulang.' }

    const { error } = await supabase.rpc('pay_debt', {
      p_user_id: user.id,
      p_debt_id: debtId,
      p_amount: paymentAmount,
    })

    if (error) throw new Error(error.message)

    revalidatePath('/debts')
    revalidatePath('/transactions')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Terjadi kesalahan pada server' }
  }
}