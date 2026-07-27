'use client'

import { useEffect, useState, useTransition } from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Navbar from '@/components/Navbar'
import { Plus, Minus, Trash2, Wallet, Tag, AlignLeft, Download, Search, Filter } from 'lucide-react'

import { transactionSchema, TransactionFormValues } from '@/lib/supabase/validations/transaction'
import { createTransaction } from '@/server/actions/transaction'

type Category = { id: string; name: string; type: 'income' | 'expense' }
type Transaction = {
  id: string
  type: 'income' | 'expense'
  amount: number
  note: string | null
  occurred_at: string
  categories: { name: string } | null
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

export default function TransactionsPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [isPending, startTransition] = useTransition()

  // State untuk Filter & Pencarian
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema) as any,
    defaultValues: {
      type: 'income',
      amount: 0,
      category_id: '',
      note: '',
      occurred_at: new Date().toISOString().slice(0, 10),
    },
  })

  const currentType = watch('type')

  async function loadData() {
    setLoadingData(true)
    try {
      const [catRes, txRes] = await Promise.all([
        fetch('/api/categories').then((r) => r.json()),
        fetch('/api/transactions').then((r) => r.json()),
      ])
      setCategories(catRes || [])
      setTransactions(txRes || [])
    } catch (error) {
      console.error("Gagal memuat data", error)
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredCategories = categories.filter((c) => c.type === currentType)

  const onSubmit: SubmitHandler<TransactionFormValues> = (data) => {
    startTransition(async () => {
      const payload = {
        ...data,
        category_id: data.category_id === '' ? null : data.category_id,
        note: data.note === '' ? null : data.note,
      }

      const result = await createTransaction(payload as any)

      if (result?.error) {
        alert('Gagal menyimpan: ' + result.error)
        return
      }

      reset({
        type: currentType, 
        amount: 0,
        category_id: '',
        note: '',
        occurred_at: new Date().toISOString().slice(0, 10),
      })
      await loadData()
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus transaksi ini?')) return
    const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
    if (res.ok) setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  // Logika Filter & Pencarian Data
  const displayedTransactions = transactions.filter((t) => {
    const matchesType = filterType === 'all' || t.type === filterType
    const noteText = t.note ? t.note.toLowerCase() : ''
    const categoryName = t.categories?.name ? t.categories.name.toLowerCase() : ''
    const matchesSearch = noteText.includes(searchQuery.toLowerCase()) || categoryName.includes(searchQuery.toLowerCase())
    return matchesType && matchesSearch
  })

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6">
        
        {/* Header dengan Tombol Export CSV */}
        <div className="mb-6 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Catat Transaksi</h1>
            <p className="text-sm text-gray-500">Tambahkan pemasukan atau pengeluaran baru</p>
          </div>
          <a 
            href="/api/transactions/export-excel" 
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Excel</span>
          </a>
        </div>

        {/* Form input terintegrasi dengan React Hook Form */}
        <form onSubmit={handleSubmit(onSubmit as any)} className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 mb-8">
          
          <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => { setValue('type', 'income'); setValue('category_id', '') }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                currentType === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Plus className="w-4 h-4" /> Pemasukan
            </button>
            <button
              type="button"
              onClick={() => { setValue('type', 'expense'); setValue('category_id', '') }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                currentType === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Minus className="w-4 h-4" /> Pengeluaran
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Wallet className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Nominal (contoh: 50000)"
                  {...register('amount')}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-50 border rounded-xl text-sm outline-none transition-all ${
                    errors.amount ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
              </div>
              {errors.amount && <p className="text-red-500 text-xs mt-1 ml-1">{errors.amount.message}</p>}
            </div>

            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Tag className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  {...register('category_id')}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none"
                >
                  <option value="">Pilih kategori (opsional)</option>
                  {filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <AlignLeft className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Catatan (opsional)"
                  {...register('note')}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full mt-6 bg-gray-900 hover:bg-gray-800 text-white rounded-xl py-3 text-sm font-medium transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {isPending ? 'Menyimpan...' : 'Simpan Transaksi'}
          </button>
        </form>

        {/* Bagian Filter dan Pencarian */}
        <div className="mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Riwayat Transaksi</h2>
            <span className="text-xs text-gray-500">Menampilkan {displayedTransactions.length} data</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {/* Input Pencarian */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Cari catatan atau kategori..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 shadow-sm"
              />
            </div>

            {/* Filter Tombol Tipe */}
            <div className="flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterType === 'all' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Semua
              </button>
              <button
                onClick={() => setFilterType('income')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterType === 'income' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Masuk
              </button>
              <button
                onClick={() => setFilterType('expense')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterType === 'expense' ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Keluar
              </button>
            </div>
          </div>
        </div>

        {/* List transaksi */}
        {loadingData ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-gray-200 h-20 rounded-xl w-full"></div>
            ))}
          </div>
        ) : displayedTransactions.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl py-12 flex flex-col items-center justify-center text-center">
            <p className="text-gray-500 text-sm">Tidak ada riwayat transaksi yang cocok.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedTransactions.map((t) => (
              <div key={t.id} className="group bg-white border border-gray-100 rounded-xl p-4 flex justify-between items-center shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${t.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {t.type === 'income' ? <Plus className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {t.categories?.name ?? (t.type === 'income' ? 'Pemasukan' : 'Pengeluaran')}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDate(t.occurred_at)}{t.note ? ` · ${t.note}` : ''}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <p className={`text-base font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatRupiah(Number(t.amount))}
                  </p>
                  <button 
                    onClick={() => handleDelete(t.id)} 
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                    title="Hapus Transaksi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}