'use client'

import { useEffect, useState, useTransition, useMemo } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { Stempel, useStempel } from '@/components/Stempel'
import { Tag, Trash2, PlusCircle, MinusCircle, Search, AlertCircle, Receipt, Plus } from 'lucide-react'

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

const SUGGESTIONS = ['Gas Elpiji', 'Listrik/Air', 'Token', 'Belanja Sembako', 'Rokok']

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

  async function handleAdd(submitName?: string) {
    const targetName = (submitName !== undefined ? submitName : name).trim()
    if (!targetName) return
    setFormError('')

    const isDuplicate = categories.some(
      (c) => c.type === type && c.name.toLowerCase() === targetName.toLowerCase()
    )
    if (isDuplicate) {
      setFormError(`Kategori "${targetName}" sudah ada`)
      return
    }

    startTransition(async () => {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: targetName, type }),
      })

      if (res.ok) {
        setName('')
        stempel.show('Ditambahkan')
        await fetchData()
      } else {
        setFormError('Gagal menambah kategori')
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
      <div className="w-full pb-16 lg:pb-10">

        {/* ===================== HEADER ===================== */}
        <div className="mb-6">
          <h1 className="text-[24px] font-extrabold tracking-tight text-ink m-0">Kategori</h1>
          <p className="text-mu mt-1 text-[14px]">Kelompok pemasukan & pengeluaran</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* ===================== KOLOM KIRI: FORM KATEGORI BARU ===================== */}
          <div className="lg:col-span-1 sticky top-6">
            <div className="bg-card border border-ln rounded-[22px] p-6 shadow-sm space-y-5">
              <h2 className="text-[17px] font-extrabold text-ink m-0">Kategori baru</h2>

              {/* Pilihan Jenis */}
              <div className="flex p-1 bg-bg border border-ln rounded-[14px]">
                <button
                  type="button"
                  onClick={() => { setType('income'); setFormError('') }}
                  disabled={isPending}
                  className={`flex-1 py-2.5 rounded-[10px] text-xs font-bold transition-all ${type === 'income' ? 'bg-card text-br shadow-sm border border-br/30' : 'text-mu hover:text-ink'}`}
                >
                  Pemasukan
                </button>
                <button
                  type="button"
                  onClick={() => { setType('expense'); setFormError('') }}
                  disabled={isPending}
                  className={`flex-1 py-2.5 rounded-[10px] text-xs font-bold transition-all ${type === 'expense' ? 'bg-card text-rd shadow-sm border border-rd/30' : 'text-mu hover:text-ink'}`}
                >
                  Pengeluaran
                </button>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-ink mb-2">Nama kategori</label>
                <input
                  type="text"
                  placeholder="Contoh: Jasa Titip"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setFormError('') }}
                  disabled={isPending}
                  maxLength={50}
                  className="w-full px-4 py-3 bg-card border border-ln rounded-[14px] text-sm text-ink outline-none focus:border-br transition-colors disabled:opacity-60"
                />
                {formError && (
                  <p className="text-rd text-xs mt-1.5 ml-1 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {formError}
                  </p>
                )}
              </div>

              {/* Rekomendasi / Saran Pill */}
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => { setName(item); handleAdd(item); }}
                    className="px-3 py-1.5 bg-bg hover:bg-so border border-ln rounded-[10px] text-xs font-bold text-ink transition-colors"
                  >
                    + {item}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleAdd()}
                disabled={isPending || !name.trim()}
                className="w-full bg-br hover:brightness-110 text-white rounded-[14px] py-4 text-sm font-bold transition-all disabled:opacity-50 shadow-[0_6px_14px_rgba(30,155,80,0.25)] flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {isPending ? 'Menambahkan...' : 'Tambah Kategori'}
              </button>
            </div>
          </div>

          {/* ===================== KOLOM KANAN: DAFTAR KATEGORI ===================== */}
          <div className="lg:col-span-2 space-y-6">

            {/* Kotak Pemasukan */}
            <div className="bg-card border border-ln rounded-[22px] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-ln">
                <h3 className="text-[16px] font-extrabold text-ink m-0">Pemasukan</h3>
                <span className="w-7 h-7 rounded-full bg-so text-br font-extrabold text-xs flex items-center justify-center border border-br/20">
                  {incomeCategories.length}
                </span>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="animate-pulse bg-bg border border-ln h-16 rounded-[14px] w-full" />
                  ))}
                </div>
              ) : incomeCategories.length === 0 ? (
                <p className="text-xs text-mu py-4 italic">Belum ada kategori pemasukan. Pakai saran di form untuk memulai.</p>
              ) : (
                <div className="space-y-3">
                  {incomeCategories.map((c) => (
                    <CategoryRow key={c.id} category={c} onDelete={handleDelete} deleting={deletingId === c.id} />
                  ))}
                </div>
              )}
            </div>

            {/* Kotak Pengeluaran */}
            <div className="bg-card border border-ln rounded-[22px] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-ln">
                <h3 className="text-[16px] font-extrabold text-ink m-0">Pengeluaran</h3>
                <span className="w-7 h-7 rounded-full bg-rs text-rd font-extrabold text-xs flex items-center justify-center border border-rd/20">
                  {expenseCategories.length}
                </span>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="animate-pulse bg-bg border border-ln h-16 rounded-[14px] w-full" />
                  ))}
                </div>
              ) : expenseCategories.length === 0 ? (
                <p className="text-xs text-mu py-4 italic">Belum ada kategori pengeluaran. Pakai saran di form untuk memulai.</p>
              ) : (
                <div className="space-y-3">
                  {expenseCategories.map((c) => (
                    <CategoryRow key={c.id} category={c} onDelete={handleDelete} deleting={deletingId === c.id} />
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </DashboardShell>
  )
}

function CategoryRow({
  category, onDelete, deleting,
}: { category: CategoryWithStats; onDelete: (id: string) => void; deleting: boolean }) {
  return (
    <div className={`bg-bg border border-ln rounded-[14px] p-4 flex items-center justify-between gap-3 shadow-sm hover:border-br/40 transition-all ${deleting ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-3.5 min-w-0">
        <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${category.type === 'income' ? 'bg-so text-br border border-br/20' : 'bg-rs text-rd border border-rd/20'}`}>
          {category.type === 'income' ? <PlusCircle className="w-4 h-4" /> : <MinusCircle className="w-4 h-4" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-ink truncate">{category.name}</p>
          <p className="text-xs text-mu mt-0.5">
            {category.monthlyCount > 0 ? `${category.monthlyCount} transaksi · ${formatRupiah(category.monthlyTotal)}` : 'Belum ada transaksi bulan ini'}
          </p>
        </div>
      </div>

      <button
        onClick={() => onDelete(category.id)}
        disabled={deleting}
        className="w-9 h-9 rounded-[10px] bg-card border border-ln text-mu hover:text-rd hover:bg-rs flex items-center justify-center transition-colors shrink-0"
        title="Hapus Kategori"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}