'use client'

import { useEffect, useState, useTransition, useMemo } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { Stempel, useStempel } from '@/components/Stempel'
import { Tag, Trash2, PlusCircle, MinusCircle, Search, AlertCircle, Receipt } from 'lucide-react'

type Category = {
  id: string
  name: string
  type: 'income' | 'expense'
}

type TransactionForStats = {
  amount: number
  occurred_at: string
  type: 'income' | 'expense'
  categories: { name: string } | null
}

type CategoryWithStats = Category & {
  monthlyCount: number
  monthlyTotal: number
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<TransactionForStats[]>([])
  const [name, setName] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [formError, setFormError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const stempel = useStempel()

  async function fetchData() {
    setFetchError(false)
    try {
      const [catRes, txRes] = await Promise.all([
        fetch('/api/categories').then((r) => r.json()),
        fetch('/api/transactions').then((r) => r.json()),
      ])
      setCategories(catRes || [])
      setTransactions(txRes || [])
    } catch (err) {
      console.error("Gagal memuat data", err)
      setFetchError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // ===== Hitung jumlah transaksi & total nilai bulan ini, per nama kategori =====
  const categoriesWithStats: CategoryWithStats[] = useMemo(() => {
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const thisMonthTx = transactions.filter((t) => new Date(t.occurred_at) >= firstDayOfMonth)

    return categories.map((c) => {
      const matching = thisMonthTx.filter((t) => t.categories?.name === c.name && t.type === c.type)
      return {
        ...c,
        monthlyCount: matching.length,
        monthlyTotal: matching.reduce((sum, t) => sum + Number(t.amount || 0), 0),
      }
    })
  }, [categories, transactions])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    const trimmedName = name.trim()
    if (!trimmedName) return

    const isDuplicate = categories.some(
      (c) => c.type === type && c.name.toLowerCase() === trimmedName.toLowerCase()
    )
    if (isDuplicate) {
      setFormError(`Kategori "${trimmedName}" sudah ada di ${type === 'income' ? 'Pemasukan' : 'Pengeluaran'}`)
      return
    }

    startTransition(async () => {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, type }),
      })

      if (res.ok) {
        setName('')
        stempel.show('Ditambahkan')
        await fetchData()
      } else {
        setFormError('Gagal menambah kategori, coba lagi')
      }
    })
  }

  async function handleDelete(id: string) {
    if (deletingId) return
    if (!confirm('Hapus kategori ini?')) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== id))
      } else {
        alert('Gagal menghapus kategori')
      }
    } finally {
      setDeletingId(null)
    }
  }

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categoriesWithStats
    const q = searchQuery.toLowerCase()
    return categoriesWithStats.filter((c) => c.name.toLowerCase().includes(q))
  }, [categoriesWithStats, searchQuery])

  const incomeCategories = filteredCategories.filter((c) => c.type === 'income')
  const expenseCategories = filteredCategories.filter((c) => c.type === 'expense')

  return (
    <DashboardShell>
      <Stempel visible={stempel.visible} label={stempel.label} />
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink tracking-tight">Kelola Kategori</h1>
          <p className="text-sm text-muted mt-1">Tambah kategori pemasukan atau pengeluaran sesuai kebutuhan warung Anda</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* KOLOM KIRI: Form Tambah Kategori */}
          <div className="lg:col-span-1 sticky top-6">
            <form onSubmit={handleAdd} className="bg-white shadow-sm rounded-2xl p-6 space-y-5">
              <h2 className="text-lg font-bold text-ink">Kategori Baru</h2>

              <div className="flex p-1 bg-lavender/60 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setType('expense'); setFormError('') }}
                  disabled={isPending}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${type === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-muted hover:text-ink'}`}
                >
                  Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => { setType('income'); setFormError('') }}
                  disabled={isPending}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${type === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-muted hover:text-ink'}`}
                >
                  Pemasukan
                </button>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Nama (cth: Rokok & Token)"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setFormError('') }}
                  disabled={isPending}
                  maxLength={50}
                  className="w-full px-4 py-3 bg-lavender/40 border border-transparent rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white transition-colors disabled:opacity-60"
                />
                {formError && (
                  <p className="text-red-500 text-xs mt-1.5 ml-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {formError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isPending || !name.trim()}
                className="w-full bg-primary hover:bg-primary-dark text-white rounded-xl py-3 text-sm font-bold transition-colors disabled:opacity-50 shadow-sm shadow-primary/30"
              >
                {isPending ? 'Menambahkan...' : 'Tambah Kategori Baru'}
              </button>

              <div className="pt-4 border-t border-lavender">
                <p className="text-xs text-muted leading-relaxed">
                  💡 Contoh kategori umum warung Madura/kelontong:<br/>
                  <span className="text-ink font-medium">Pengeluaran:</span> Belanja Sembako, Rokok & Token, Gas Elpiji, Listrik/Air<br/>
                  <span className="text-ink font-medium">Pemasukan:</span> Penjualan Harian, Jasa Titip, Token & Pulsa
                </p>
              </div>
            </form>
          </div>

          {/* KOLOM KANAN: Daftar Kategori */}
          <div className="lg:col-span-2">

            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-ink">Daftar Kategori Anda</h2>
              <div className="relative w-full max-w-[220px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-muted" />
                </div>
                <input
                  type="text"
                  placeholder="Cari kategori..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
                />
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse bg-white/60 h-20 rounded-xl w-full"></div>
                ))}
              </div>
            ) : fetchError ? (
              <div className="bg-red-50 rounded-2xl py-12 text-center text-sm text-red-600 flex flex-col items-center justify-center">
                <AlertCircle className="w-8 h-8 mb-2" />
                <p>Gagal memuat kategori.</p>
                <button onClick={() => { setLoading(true); fetchData() }} className="mt-3 text-primary font-medium underline text-sm">
                  Coba lagi
                </button>
              </div>
            ) : categories.length === 0 ? (
              <div className="bg-white/60 border-2 border-dashed border-borderc rounded-2xl py-12 text-center text-sm text-muted flex flex-col items-center justify-center">
                <Tag className="w-8 h-8 text-borderc mb-2" />
                <p>Belum ada kategori kustom.<br/>Silakan tambah melalui form di samping.</p>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="bg-white/60 border-2 border-dashed border-borderc rounded-2xl py-12 text-center text-sm text-muted">
                <p>Tidak ada kategori yang cocok dengan pencarian "{searchQuery}"</p>
              </div>
            ) : (
              <div className="space-y-6">
                {expenseCategories.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2.5">
                      Pengeluaran ({expenseCategories.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {expenseCategories.map((c) => (
                        <CategoryCard key={c.id} category={c} onDelete={handleDelete} deleting={deletingId === c.id} />
                      ))}
                    </div>
                  </div>
                )}

                {incomeCategories.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2.5">
                      Pemasukan ({incomeCategories.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {incomeCategories.map((c) => (
                        <CategoryCard key={c.id} category={c} onDelete={handleDelete} deleting={deletingId === c.id} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </DashboardShell>
  )
}

function CategoryCard({
  category, onDelete, deleting,
}: { category: CategoryWithStats; onDelete: (id: string) => void; deleting: boolean }) {
  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all ${deleting ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2.5 rounded-lg shrink-0 ${category.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {category.type === 'income' ? <PlusCircle className="w-5 h-5" /> : <MinusCircle className="w-5 h-5" />}
          </div>
          <p className="text-sm font-bold text-ink truncate">{category.name}</p>
        </div>
        <button
          onClick={() => onDelete(category.id)}
          disabled={deleting}
          className="p-2 text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none disabled:opacity-50 shrink-0"
          title="Hapus Kategori"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-lavender/40 rounded-lg px-3 py-2.5 flex items-center justify-between">
        {category.monthlyCount > 0 ? (
          <>
            <span className="text-xs text-muted flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" /> {category.monthlyCount} transaksi bulan ini
            </span>
            <span className={`text-sm font-bold ${category.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
              {formatRupiah(category.monthlyTotal)}
            </span>
          </>
        ) : (
          <span className="text-xs text-muted">Belum ada transaksi bulan ini</span>
        )}
      </div>
    </div>
  )
}