'use client'

import { useEffect, useState, useTransition } from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Navbar from '@/components/Navbar'
import { User, Phone, Wallet, Calendar, AlignLeft, CheckCircle2, Clock } from 'lucide-react'

// Pastikan path import ini sesuai dengan yang Anda buat di Langkah 2 & 3
import { debtSchema, DebtFormValues } from '@/lib/supabase/validations/debt'
import { createDebt, payDebt } from '@/server/actions/debt'

type Debt = {
  id: string
  customer_name: string
  customer_phone: string | null
  amount: number
  paid_amount: number
  status: 'unpaid' | 'partial' | 'paid'
  due_date: string | null
  notes: string | null
  created_at: string
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [isPending, startTransition] = useTransition()

  // State untuk animasi tombol bayar
  const [payingId, setPayingId] = useState<string | null>(null)
  const [payAmount, setPayAmount] = useState<string>('')
  const [isPaying, startPayingTransition] = useTransition()

  // Fungsi untuk memproses pembayaran cicilan
  async function handlePay(debtId: string) {
    if (!payAmount || Number(payAmount) <= 0) return alert('Masukkan nominal yang valid')

    startPayingTransition(async () => {
      const result = await payDebt(debtId, Number(payAmount))
      if (result?.error) {
        alert('Gagal membayar: ' + result.error)
      } else {
        setPayingId(null)
        setPayAmount('')
        await loadData() // muat ulang data setelah sukses
      }
    })
  }

  // Setup React Hook Form untuk Kasbon
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DebtFormValues>({
    resolver: zodResolver(debtSchema) as any,
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      amount: 0,
      due_date: '',
      notes: '',
    },
  })

  // Memuat data kasbon 
  async function loadData() {
    setLoadingData(true)
    try {
      const res = await fetch('/api/debts').then((r) => r.json())
      setDebts(res || [])
    } catch (error) {
      console.error("Gagal memuat data kasbon", error)
      setDebts([])
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Fungsi Submit Data Kasbon Baru
  const onSubmit: SubmitHandler<DebtFormValues> = (data) => {
    startTransition(async () => {
      // Sanitasi data sebelum dikirim
      const payload = {
        ...data,
        customer_phone: data.customer_phone === '' ? null : data.customer_phone,
        due_date: data.due_date === '' ? null : data.due_date,
        notes: data.notes === '' ? null : data.notes,
      }

      const result = await createDebt(payload as any)

      if (result?.error) {
        alert('Gagal menyimpan kasbon: ' + result.error)
        return
      }

      // Reset form dan muat ulang data
      reset({
        customer_name: '',
        customer_phone: '',
        amount: 0,
        due_date: '',
        notes: '',
      })
      await loadData()
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6">
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Catat Kasbon</h1>
          <p className="text-sm text-gray-500">Catat utang atau piutang pelanggan warung Anda</p>
        </div>

        {/* Form Kasbon */}
        <form onSubmit={handleSubmit(onSubmit as any)} className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 mb-8">
          <div className="space-y-4">
            
            {/* Input Nama Pelanggan */}
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Nama Pelanggan (Wajib)"
                  {...register('customer_name')}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl text-sm outline-none transition-all ${
                    errors.customer_name ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
              </div>
              {errors.customer_name && <p className="text-red-500 text-xs mt-1 ml-1">{errors.customer_name.message}</p>}
            </div>

            {/* Input Nomor HP */}
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="tel"
                  placeholder="Nomor HP / WhatsApp (Opsional)"
                  {...register('customer_phone')}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Input Nominal Utang */}
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Wallet className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Total Pinjaman/Kasbon (Wajib)"
                  {...register('amount')}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl text-sm outline-none transition-all ${
                    errors.amount ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
              </div>
              {errors.amount && <p className="text-red-500 text-xs mt-1 ml-1">{errors.amount.message}</p>}
            </div>

            {/* Input Tanggal Jatuh Tempo */}
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="date"
                  {...register('due_date')}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-500"
                />
              </div>
              <p className="text-gray-400 text-xs mt-1 ml-1">Batas waktu pembayaran (Opsional)</p>
            </div>

            {/* Input Catatan */}
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <AlignLeft className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Catatan pembelian (Opsional)"
                  {...register('notes')}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full mt-6 bg-orange-600 hover:bg-orange-700 text-white rounded-xl py-3 text-sm font-medium transition-colors disabled:opacity-50 flex justify-center items-center gap-2 shadow-sm"
          >
            {isPending ? 'Menyimpan Kasbon...' : 'Simpan Kasbon Baru'}
          </button>
        </form>

        {/* List Kasbon */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Daftar Utang Belum Lunas</h2>
        </div>

        {loadingData ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse bg-gray-200 h-24 rounded-xl w-full"></div>
            ))}
          </div>
        ) : debts.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl py-12 flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="h-10 w-10 text-green-500 mb-2 opacity-50" />
            <p className="text-gray-500 text-sm">Bagus! Tidak ada kasbon yang belum dibayar.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {debts.map((debt) => (
              <div key={debt.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                      {debt.customer_name}
                      {debt.status === 'unpaid' && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">Belum Bayar</span>}
                      {debt.status === 'partial' && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">Nyicil</span>}
                      {debt.status === 'paid' && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Lunas</span>}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                      <Clock className="w-4 h-4" /> {formatDate(debt.created_at)}
                      {debt.due_date && ` • Jatuh Tempo: ${formatDate(debt.due_date)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Total Utang</p>
                    <p className="font-bold text-gray-900">{formatRupiah(Number(debt.amount || 0))}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center border border-gray-100 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Sisa Utang</p>
                    <p className="font-bold text-red-600 text-lg">
                      {formatRupiah(Number(debt.amount || 0) - Number(debt.paid_amount || 0))}
                    </p>
                  </div>
                  
                  {debt.status !== 'paid' && (
                    <div className="w-full sm:w-auto">
                      {payingId === debt.id ? (
                        <div className="flex items-center gap-2 w-full">
                          <input
                            type="number"
                            placeholder="Nominal..."
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                            className="w-full sm:w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-green-500"
                          />
                          <button
                            onClick={() => handlePay(debt.id)}
                            disabled={isPaying}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap disabled:opacity-50"
                          >
                            {isPaying ? '...' : 'Simpan'}
                          </button>
                          <button
                            onClick={() => { setPayingId(null); setPayAmount(''); }}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setPayingId(debt.id)}
                          className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                        >
                          Bayar Cicilan
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}