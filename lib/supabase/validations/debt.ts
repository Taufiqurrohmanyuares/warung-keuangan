import { z } from 'zod'

export const debtSchema = z.object({
  customer_name: z.string().min(1, 'Nama pelanggan wajib diisi'),
  customer_phone: z.string().optional(),
  amount: z.coerce.number().min(1, 'Nominal kasbon harus lebih dari 0'),
  due_date: z.string().optional(),
  notes: z.string().optional(),
})

export type DebtFormValues = z.infer<typeof debtSchema>