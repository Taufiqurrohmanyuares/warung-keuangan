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
} // <-- Perbaikan: Kurung kurawal penutup createDebt diletakkan di sini

// Fungsi bayar cicilan sekarang berdiri sendiri
export async function payDebt(debtId: string, paymentAmount: number) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Sesi habis, silakan login ulang.' }

    // 1. Ambil data kasbon saat ini
    const { data: currentDebt, error: fetchError } = await supabase
      .from('debts')
      .select('*')
      .eq('id', debtId)
      .single()

    if (fetchError) throw new Error('Gagal mengambil data kasbon')

    // 2. Hitung total yang sudah dibayar
    const totalAmount = Number(currentDebt.amount)
    const newPaidAmount = Number(currentDebt.paid_amount || 0) + Number(paymentAmount)
    
    // 3. Tentukan status baru (apakah sudah lunas atau masih nyicil)
    let finalPaidAmount = newPaidAmount
    let newStatus = 'partial'

    if (newPaidAmount >= totalAmount) {
      finalPaidAmount = totalAmount // Mencegah kelebihan bayar
      newStatus = 'paid'
    }

    // 4. Simpan pembaruan ke database
    const { error: updateError } = await supabase
      .from('debts')
      .update({
        paid_amount: finalPaidAmount,
        status: newStatus
      })
      .eq('id', debtId)

    if (updateError) throw new Error(updateError.message)

    revalidatePath('/debts')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Terjadi kesalahan pada server' }
  }
}