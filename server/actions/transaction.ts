'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { transactionSchema } from '@/lib/supabase/validations/transaction'

export async function createTransaction(formData: unknown) {
  try {
    // 1. Validasi data input secara ketat menggunakan Zod
    const parsedData = transactionSchema.safeParse(formData)
    
    if (!parsedData.success) {
      return { 
        error: 'Data tidak valid', 
        details: parsedData.error.flatten().fieldErrors 
      }
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Sesi Anda telah berakhir, silakan login kembali.' }
    }

    // 2. Insert data ke Supabase
    const { error } = await supabase
      .from('transactions')
      .insert([{
        user_id: user.id,
        ...parsedData.data
      }])

    if (error) throw new Error(error.message)

    // 3. Revalidate path (Membersihkan cache Next.js agar UI langsung update tanpa reload)
    revalidatePath('/dashboard')
    revalidatePath('/transactions')

    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Terjadi kesalahan pada server' }
  }
}