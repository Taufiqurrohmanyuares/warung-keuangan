'use client'

import { useEffect, useState, useTransition, useMemo } from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import DashboardShell from '@/components/DashboardShell'
import { Stempel, useStempel } from '@/components/Stempel'
import { Plus, Minus, Trash2, Wallet, Tag, AlignLeft, Download, Search, ShoppingCart } from 'lucide-react'

import { transactionSchema, TransactionFormValues } from '@/lib/supabase/validations/transaction'
import { createTransaction } from '@/server/actions/transaction'

type Category = { id: string; name: string; type: 'income' | 'expense' }
type Transaction = {
  id: string
  type: 'income' | 'expense'
  amount: number
  note: string | null
  occurred_at: string
  source: 'manual' | 'kasir' | null
  categories: { name: string } | null
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

function getDateGroupLabel(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

  if (isSameDay(date, today)) return 'Hari Ini'
  if (isSameDay(date, yesterday)) return 'Kemarin'
  return formatDate(dateString)
}

export default function TransactionsPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const stempel = useStempel()

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
        note: data.note ? data.note.trim() || null : null,
      }

      const result = await createTransaction(payload as any)

      if (result?.error) {
        alert('Gagal menyimpan: ' + result.error)
        return
      }

      stempel.show('Tersimpan')
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
    if (deletingId) return
    if (!confirm('Hapus transaksi ini?')) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
      if (res.ok) setTransactions((prev) => prev.filter((t) => t.id !== id))
      else alert('Gagal menghapus transaksi')
    } finally {
      setDeletingId(null)
    }
  }

  const displayedTransactions = transactions.filter((t) => {
    const matchesType = filterType === 'all' || t.type === filterType
    const noteText = t.note ? t.note.toLowerCase() : ''
    const categoryName = t.categories?.name ? t.categories.name.toLowerCase() : ''
    const matchesSearch = noteText.includes(searchQuery.toLowerCase()) || categoryName.includes(searchQuery.toLowerCase())
    return matchesType && matchesSearch
  })

  const filteredSummary = useMemo(() => {
    const income = displayedTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const expense = displayedTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    return { income, expense }
  }, [displayedTransactions])

  const groupedTransactions = useMemo(() => {
    const groups: { label: string; items: Transaction[]; net: number }[] = []

    for (const t of displayedTransactions) {
      const label = getDateGroupLabel(t.occurred_at)
      let group = groups.find((g) => g.label === label)
      if (!group) {
        group = { label, items: [], net: 0 }
        groups.push(group)
      }
      group.items.push(t)
      group.net += t.type === 'income' ? Number(t.amount) : -Number(t.amount)
    }

    return groups
  }, [displayedTransactions])

  return (
    <DashboardShell>
      <Stempel visible={stempel.visible} label={stempel.label} />
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full">

        <div className="mb-6 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink tracking-tight">Catat Transaksi</h1>
            <p className="text-sm text-muted">Tambahkan pemasukan atau pengeluaran baru</p>
          </div>
          <a 
            href="/api/transactions/export-excel" 
            className="flex items-center gap-2 px-4 py-2 bg-white text-ink rounded-xl text-sm font-medium hover:bg-lavender/60 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Excel</span>
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* KOLOM KIRI: Form Input */}
          <div className="lg:col-span-1 sticky top-6">
            <form onSubmit={handleSubmit(onSubmit as any)} className="bg-white shadow-sm rounded-2xl p-6">
              
              <div className="flex p-1 bg-lavender/60 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => { setValue('type', 'income'); setValue('category_id', '') }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    currentType === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-muted hover:text-ink'
                  }`}
                >
                  <Plus className="w-4 h-4" /> Pemasukan
                </button>
                <button
                  type="button"
                  onClick={() => { setValue('type', 'expense'); setValue('category_id', '') }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    currentType === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-muted hover:text-ink'
                  }`}
                >
                  <Minus className="w-4 h-4" /> Pengeluaran
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Wallet className="h-5 w-5 text-muted" />
                    </div>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="Nominal (contoh: 50000)"
                      {...register('amount', { valueAsNumber: true })}
                      className={`w-full pl-10 pr-4 py-3 bg-lavender/40 border rounded-xl text-sm outline-none transition-all ${
                        errors.amount ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-transparent focus:ring-2 focus:ring-primary/30 focus:bg-white'
                      }`}
                    />
                  </div>
                  {errors.amount && <p className="text-red-500 text-xs mt-1 ml-1">{errors.amount.message}</p>}
                </div>

                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Tag className="h-5 w-5 text-muted" />
                    </div>
                    <select
                      {...register('category_id')}
                      className="w-full pl-10 pr-4 py-3 bg-lavender/40 border border-transparent rounded-xl text-sm focus:ring-2 focus:ring-primary/30 focus:bg-white outline-none transition-all appearance-none text-ink"
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
                      <AlignLeft className="h-5 w-5 text-muted" />
                    </div>
                    <input
                      type="text"
                      placeholder="Catatan (opsional)"
                      {...register('note')}
                      className="w-full pl-10 pr-4 py-3 bg-lavender/40 border border-transparent rounded-xl text-sm focus:ring-2 focus:ring-primary/30 focus:bg-white outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full mt-6 bg-primary hover:bg-primary-dark text-white rounded-xl py-3 text-sm font-medium transition-colors disabled:opacity-50 flex justify-center items-center gap-2 shadow-sm shadow-primary/30"
              >
                {isPending ? 'Menyimpan...' : 'Simpan Transaksi'}
              </button>
            </form>
          </div>

          {/* KOLOM KANAN: Daftar Transaksi & Filter */}
          <div className="lg:col-span-2">
            
            <div className="mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-ink">Riwayat Transaksi</h2>
                <span className="text-xs text-muted">Menampilkan {displayedTransactions.length} data</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-muted" />
                  </div>
                  <input
                    type="text"
                    placeholder="Cari catatan atau kategori..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
                  />
                </div>

                <div className="flex bg-white rounded-xl p-1 shadow-sm">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterType === 'all' ? 'bg-primary text-white' : 'text-muted hover:bg-lavender/50'}`}
                  >
                    Semua
                  </button>
                  <button
                    onClick={() => setFilterType('income')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterType === 'income' ? 'bg-green-600 text-white' : 'text-muted hover:bg-lavender/50'}`}
                  >
                    Masuk
                  </button>
                  <button
                    onClick={() => setFilterType('expense')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterType === 'expense' ? 'bg-red-600 text-white' : 'text-muted hover:bg-lavender/50'}`}
                  >
                    Keluar
                  </button>
                </div>
              </div>

              {displayedTransactions.length > 0 && (
                <div className="flex items-center gap-4 bg-primary-light rounded-xl px-4 py-2.5 text-sm">
                  <span className="text-green-700 font-semibold">+{formatRupiah(filteredSummary.income)}</span>
                  <span className="text-red-600 font-semibold">-{formatRupiah(filteredSummary.expense)}</span>
                  <span className="ml-auto text-primary font-bold">
                    Bersih: {formatRupiah(filteredSummary.income - filteredSummary.expense)}
                  </span>
                </div>
              )}
            </div>

            {loadingData ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse bg-white/60 h-20 rounded-xl w-full"></div>
                ))}
              </div>
            ) : displayedTransactions.length === 0 ? (
              <div className="bg-white/60 border-2 border-dashed border-borderc rounded-2xl py-12 flex flex-col items-center justify-center text-center">
                <p className="text-muted text-sm">Tidak ada riwayat transaksi yang cocok.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedTransactions.map((group) => (
                  <div key={group.label}>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <h3 className="text-xs font-bold text-muted uppercase tracking-wider">{group.label}</h3>
                      <span className={`text-xs font-bold ${group.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {group.net >= 0 ? '+' : ''}{formatRupiah(group.net)}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {group.items.map((t) => {
                        const isDeleting = deletingId === t.id
                        return (
                          <div
                            key={t.id}
                            className={`group bg-white rounded-xl p-4 flex justify-between items-center shadow-sm hover:shadow-md transition-all ${isDeleting ? 'opacity-50' : ''}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-xl ${t.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                {t.type === 'income' ? <Plus className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-bold text-ink">
                                    {t.categories?.name ?? (t.type === 'income' ? 'Pemasukan' : 'Pengeluaran')}
                                  </p>
                                  {t.source === 'kasir' && (
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-primary-light text-primary text-[10px] font-bold rounded-md shrink-0">
                                      <ShoppingCart className="w-2.5 h-2.5" /> Kasir
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted mt-0.5">
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
                                disabled={isDeleting}
                                className="p-2 text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
                                title="Hapus Transaksi"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}