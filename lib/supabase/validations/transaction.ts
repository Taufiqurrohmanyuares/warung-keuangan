import { z } from 'zod'

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().min(1, 'Nominal wajib diisi dan harus lebih dari 0'),
  // Tambahkan .nullable() pada category_id dan note
  category_id: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  occurred_at: z.string().min(1, 'Tanggal wajib diisi'),
})

export type TransactionFormValues = z.infer<typeof transactionSchema>