'use client'

import { useEffect, useState, useTransition, useMemo } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { Stempel, useStempel } from '@/components/Stempel'
import {
  Package, Trash2, PlusCircle, MinusCircle, Search, ChevronLeft, ChevronRight,
  SlidersHorizontal, Boxes, AlertTriangle, Wallet, PackagePlus, Barcode, Pencil, Check, X,
} from 'lucide-react'
import { LOW_STOCK_THRESHOLD } from '@/lib/supabase/constants'

type Product = {
  id: string
  name: string
  stock: number
  unit: string
  price: number
  cost_price?: number | null
  barcode?: string | null
}

const COMMON_UNITS = ['pcs', 'dus', 'renceng', 'bungkus', 'botol', 'kg', 'gram', 'liter', 'sachet']

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [restockingId, setRestockingId] = useState<string | null>(null)
  const [restockAmount, setRestockAmount] = useState('')
  const stempel = useStempel()

  const [name, setName] = useState('')
  const [stock, setStock] = useState('')
  const [unit, setUnit] = useState('pcs')
  const [price, setPrice] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [barcode, setBarcode] = useState('')
  const [editingBarcodeId, setEditingBarcodeId] = useState<string | null>(null)
  const [editingBarcodeValue, setEditingBarcodeValue] = useState('')
  const [savingBarcode, setSavingBarcode] = useState(false)
  const [editingCostPriceId, setEditingCostPriceId] = useState<string | null>(null)
  const [editingCostPriceValue, setEditingCostPriceValue] = useState('')
  const [savingCostPrice, setSavingCostPrice] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  async function fetchProducts() {
    try {
      const res = await fetch('/api/products').then((r) => r.json())
      setProducts(res || [])
    } catch (err) {
      console.error("Gagal memuat produk", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortBy])

  // ===== Ringkasan operasional warung =====
  const summary = useMemo(() => {
    const totalJenis = products.length
    const stokTipis = products.filter((p) => p.stock <= LOW_STOCK_THRESHOLD).length
    const totalNilai = products.reduce((sum, p) => sum + Number(p.stock) * Number(p.price || 0), 0)
    return { totalJenis, stokTipis, totalNilai }
  }, [products])

  let processedProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  processedProducts = [...processedProducts].sort((a, b) => {
    if (sortBy === 'name_asc') return a.name.localeCompare(b.name)
    if (sortBy === 'stock_asc') return a.stock - b.stock
    if (sortBy === 'stock_desc') return b.stock - a.stock
    return 0
  })

  const totalPages = Math.ceil(processedProducts.length / itemsPerPage)
  const paginatedProducts = processedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return

    startTransition(async () => {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          stock: Number(stock) || 0,
          unit,
          price: Number(price) || 0,
          cost_price: Number(costPrice) || 0,
          barcode: barcode.trim() || null,
        }),
      })

      if (res.ok) {
        setName(''); setStock(''); setPrice(''); setCostPrice(''); setUnit('pcs'); setBarcode('')
        stempel.show('Ditambahkan')
        await fetchProducts()
      } else {
        const result = await res.json().catch(() => null)
        alert(result?.error || 'Gagal menambah produk')
      }
    })
  }

  async function handleSaveBarcode(id: string) {
    if (savingBarcode) return
    setSavingBarcode(true)
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: editingBarcodeValue.trim() || null }),
      })
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, barcode: editingBarcodeValue.trim() || null } : p))
        )
        setEditingBarcodeId(null)
        stempel.show('Barcode disimpan')
      } else {
        const result = await res.json().catch(() => null)
        alert(result?.error || 'Gagal menyimpan barcode')
      }
    } finally {
      setSavingBarcode(false)
    }
  }

  async function handleSaveCostPrice(id: string) {
    if (savingCostPrice) return
    setSavingCostPrice(true)
    try {
      const value = Number(editingCostPriceValue) || 0
      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cost_price: value }),
      })
      if (res.ok) {
        setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, cost_price: value } : p)))
        setEditingCostPriceId(null)
        stempel.show('Harga modal disimpan')
      } else {
        const result = await res.json().catch(() => null)
        alert(result?.error || 'Gagal menyimpan harga modal')
      }
    } finally {
      setSavingCostPrice(false)
    }
  }

  async function handleUpdateStock(id: string, delta: number) {
    if (updatingIds.has(id)) return

    const product = products.find((p) => p.id === id)
    if (!product) return
    const newStock = product.stock + delta
    if (newStock < 0) return alert('Stok tidak boleh kurang dari 0')

    setUpdatingIds((prev) => new Set(prev).add(id))
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, stock: newStock } : p)))

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock }),
      })
      if (!res.ok) {
        setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, stock: product.stock } : p)))
        alert('Gagal memperbarui stok')
      }
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  async function handleBulkRestock(id: string) {
    const amount = Number(restockAmount)
    if (!amount || amount <= 0) return alert('Masukkan jumlah restock yang valid')
    await handleUpdateStock(id, amount)
    setRestockingId(null)
    setRestockAmount('')
    stempel.show('Stok ditambah')
  }

  async function handleDelete(id: string) {
    if (deletingId) return
    if (!confirm('Hapus barang ini dari daftar stok?')) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' })
      if (res.ok) setProducts((prev) => prev.filter((p) => p.id !== id))
      else alert('Gagal menghapus produk')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <DashboardShell>
      <Stempel visible={stempel.visible} label={stempel.label} />
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink tracking-tight">Stok Barang Warung</h1>
          <p className="text-sm text-muted mt-1">Kelola dan pantau ketersediaan barang dengan mudah</p>
        </div>

        {/* ===== RINGKASAN ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white shadow-sm rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted">Jenis Barang</span>
              <div className="p-2 bg-primary-light rounded-lg"><Boxes className="w-4 h-4 text-primary" /></div>
            </div>
            <p className="text-xl font-bold text-ink">{summary.totalJenis} Jenis</p>
          </div>
          <div className={`rounded-2xl p-5 shadow-sm ${summary.stokTipis > 0 ? 'bg-red-50' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-medium ${summary.stokTipis > 0 ? 'text-red-600' : 'text-muted'}`}>Stok Tipis</span>
              <div className={`p-2 rounded-lg ${summary.stokTipis > 0 ? 'bg-red-100' : 'bg-primary-light'}`}>
                <AlertTriangle className={`w-4 h-4 ${summary.stokTipis > 0 ? 'text-red-600' : 'text-primary'}`} />
              </div>
            </div>
            <p className={`text-xl font-bold ${summary.stokTipis > 0 ? 'text-red-600' : 'text-ink'}`}>{summary.stokTipis} Barang</p>
          </div>
          <div className="bg-white shadow-sm rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted">Total Nilai Stok</span>
              <div className="p-2 bg-primary-light rounded-lg"><Wallet className="w-4 h-4 text-primary" /></div>
            </div>
            <p className="text-xl font-bold text-ink">{formatRupiah(summary.totalNilai)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* KOLOM KIRI: Form Tambah Barang */}
          <div className="lg:col-span-1 sticky top-6">
            <form onSubmit={handleAdd} className="bg-white shadow-sm rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-ink mb-2">Tambah Barang Baru</h3>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Nama Barang (contoh: Indomie Goreng)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  className="w-full px-4 py-3 bg-lavender/40 border border-transparent rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white transition-colors"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    min={0}
                    placeholder="Stok Awal"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-4 py-3 bg-lavender/40 border border-transparent rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white transition-colors"
                  />
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-4 py-3 bg-lavender/40 border border-transparent rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white transition-colors appearance-none text-ink"
                  >
                    {COMMON_UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    min={0}
                    placeholder="Harga Modal (Opsional)"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full px-4 py-3 bg-lavender/40 border border-transparent rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white transition-colors"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="Harga Jual (Opsional)"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-4 py-3 bg-lavender/40 border border-transparent rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white transition-colors"
                  />
                </div>
                {Number(price) > 0 && Number(costPrice) > 0 && (
                  <p className={`text-xs font-medium -mt-1 ml-1 ${Number(price) - Number(costPrice) >= 0 ? 'text-income' : 'text-red-600'}`}>
                    Untung per satuan: {formatRupiah(Number(price) - Number(costPrice))}
                  </p>
                )}
                <div className="relative">
                  <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Barcode (opsional, bisa scan langsung)"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 bg-lavender/40 border border-transparent rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white transition-colors font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending || !name.trim()}
                className="w-full mt-2 bg-primary hover:bg-primary-dark text-white rounded-xl py-3 text-sm font-bold transition-colors disabled:opacity-50 shadow-sm shadow-primary/30"
              >
                {isPending ? 'Menyimpan...' : 'Simpan Barang'}
              </button>
            </form>
          </div>

          {/* KOLOM KANAN: Daftar Stok Barang */}
          <div className="lg:col-span-2">

            <div className="flex flex-col sm:flex-row gap-3 mb-6 bg-white p-3 rounded-2xl shadow-sm">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                <input
                  type="text"
                  placeholder="Cari nama barang..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-lavender/40 border border-transparent rounded-xl text-sm focus:ring-2 focus:ring-primary/30 outline-none transition-colors"
                />
              </div>
              <div className="relative w-full sm:w-48">
                <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-lavender/40 border border-transparent rounded-xl text-sm focus:ring-2 focus:ring-primary/30 outline-none appearance-none transition-colors text-ink"
                >
                  <option value="newest">Baru Ditambahkan</option>
                  <option value="name_asc">Nama (A-Z)</option>
                  <option value="stock_asc">Stok Paling Sedikit</option>
                  <option value="stock_desc">Stok Paling Banyak</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse bg-white/60 h-32 rounded-2xl w-full"></div>
                ))}
              </div>
            ) : paginatedProducts.length === 0 ? (
              <div className="bg-white/60 border-2 border-dashed border-borderc rounded-2xl py-12 flex flex-col items-center justify-center text-center">
                <Package className="h-10 w-10 text-borderc mb-2" />
                <p className="text-muted text-sm">Tidak ada barang yang ditemukan.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {paginatedProducts.map((p) => {
                    const isUpdating = updatingIds.has(p.id)
                    const isDeleting = deletingId === p.id
                    const isRestocking = restockingId === p.id

                    return (
                      <div
                        key={p.id}
                        className={`bg-white rounded-xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all ${isDeleting ? 'opacity-50' : ''}`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-bold text-ink text-base leading-tight mb-1">{p.name}</h3>
                            <p className="text-sm text-muted font-medium">
                              {Number(p.price) > 0 ? `Harga: ${formatRupiah(Number(p.price))}` : 'Harga belum diatur'}
                            </p>
                            {Number(p.price) > 0 && Number(p.cost_price) > 0 && (
                              <p className={`text-xs font-semibold mt-0.5 ${Number(p.price) - Number(p.cost_price) >= 0 ? 'text-income' : 'text-red-600'}`}>
                                Untung: {formatRupiah(Number(p.price) - Number(p.cost_price))} / satuan
                              </p>
                            )}
                          </div>
                          {p.stock <= LOW_STOCK_THRESHOLD && (
                            <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] uppercase tracking-wider rounded-md font-bold whitespace-nowrap">
                              Stok Tipis
                            </span>
                          )}
                        </div>

                        {/* Harga modal: lihat / edit inline */}
                        <div className="mb-2">
                          {editingCostPriceId === p.id ? (
                            <div className="flex items-center gap-1.5">
                              <Wallet className="w-3.5 h-3.5 text-muted shrink-0" />
                              <input
                                autoFocus
                                type="number"
                                min={0}
                                value={editingCostPriceValue}
                                onChange={(e) => setEditingCostPriceValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveCostPrice(p.id)
                                  if (e.key === 'Escape') setEditingCostPriceId(null)
                                }}
                                placeholder="Harga modal"
                                className="min-w-0 flex-1 px-2 py-1 bg-lavender/40 rounded-md text-xs outline-none focus:ring-2 focus:ring-primary/30"
                              />
                              <button
                                onClick={() => handleSaveCostPrice(p.id)}
                                disabled={savingCostPrice}
                                className="p-1 text-primary hover:bg-primary-light rounded transition-colors shrink-0"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingCostPriceId(null)}
                                className="p-1 text-muted hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingCostPriceId(p.id)
                                setEditingCostPriceValue(p.cost_price ? String(p.cost_price) : '')
                              }}
                              className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors group"
                            >
                              <Wallet className="w-3.5 h-3.5 shrink-0" />
                              {Number(p.cost_price) > 0 ? (
                                <span>Modal: {formatRupiah(Number(p.cost_price))}</span>
                              ) : (
                                <span className="italic">Belum ada harga modal</span>
                              )}
                              <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          )}
                        </div>

                        {/* Barcode: lihat / edit inline */}
                        <div className="mb-3">
                          {editingBarcodeId === p.id ? (
                            <div className="flex items-center gap-1.5">
                              <Barcode className="w-3.5 h-3.5 text-muted shrink-0" />
                              <input
                                autoFocus
                                type="text"
                                value={editingBarcodeValue}
                                onChange={(e) => setEditingBarcodeValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveBarcode(p.id)
                                  if (e.key === 'Escape') setEditingBarcodeId(null)
                                }}
                                placeholder="Scan atau ketik barcode"
                                className="min-w-0 flex-1 px-2 py-1 bg-lavender/40 rounded-md text-xs font-mono outline-none focus:ring-2 focus:ring-primary/30"
                              />
                              <button
                                onClick={() => handleSaveBarcode(p.id)}
                                disabled={savingBarcode}
                                className="p-1 text-primary hover:bg-primary-light rounded transition-colors shrink-0"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingBarcodeId(null)}
                                className="p-1 text-muted hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingBarcodeId(p.id)
                                setEditingBarcodeValue(p.barcode || '')
                              }}
                              className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors group"
                            >
                              <Barcode className="w-3.5 h-3.5 shrink-0" />
                              {p.barcode ? (
                                <span className="font-mono">{p.barcode}</span>
                              ) : (
                                <span className="italic">Belum ada barcode</span>
                              )}
                              <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          )}
                        </div>

                        <div className="border-t border-lavender pt-3 mt-auto space-y-3">
                          <div className="flex items-end justify-between">
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-black text-primary tabular-nums">{p.stock}</span>
                              <span className="text-xs font-medium text-muted">{p.unit}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-0.5 bg-lavender/50 p-1 rounded-lg">
                                <button
                                  onClick={() => handleUpdateStock(p.id, -1)}
                                  disabled={isUpdating || p.stock <= 0}
                                  className="p-1.5 text-muted hover:text-ink hover:bg-white hover:shadow-sm rounded-md transition-all disabled:opacity-40"
                                >
                                  <MinusCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleUpdateStock(p.id, 1)}
                                  disabled={isUpdating}
                                  className="p-1.5 text-muted hover:text-ink hover:bg-white hover:shadow-sm rounded-md transition-all disabled:opacity-40"
                                >
                                  <PlusCircle className="w-4 h-4" />
                                </button>
                              </div>
                              <button
                                onClick={() => setRestockingId(isRestocking ? null : p.id)}
                                className="p-2 text-primary hover:bg-primary-light rounded-lg transition-colors"
                                title="Restock banyak sekaligus"
                              >
                                <PackagePlus className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(p.id)}
                                disabled={isDeleting}
                                className="p-2 text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {isRestocking && (
                            <div className="flex items-center gap-2 bg-primary-light rounded-lg p-2">
                              <input
                                type="number"
                                min={1}
                                autoFocus
                                placeholder={`Tambah berapa ${p.unit}?`}
                                value={restockAmount}
                                onChange={(e) => setRestockAmount(e.target.value)}
                                className="flex-1 px-3 py-1.5 bg-white rounded-md text-sm outline-none"
                              />
                              <button
                                onClick={() => handleBulkRestock(p.id)}
                                className="bg-primary text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-primary-dark transition-colors"
                              >
                                Tambah
                              </button>
                              <button
                                onClick={() => { setRestockingId(null); setRestockAmount('') }}
                                className="text-muted px-2 py-1.5 text-xs font-medium"
                              >
                                Batal
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 bg-white p-3 rounded-2xl shadow-sm">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-ink bg-lavender/50 hover:bg-lavender rounded-lg transition-colors disabled:opacity-50"
                    >
                      <ChevronLeft className="w-4 h-4" /> Prev
                    </button>
                    <span className="text-sm font-medium text-muted">
                      Hal <span className="text-ink">{currentPage}</span> dari {totalPages}
                    </span>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-ink bg-lavender/50 hover:bg-lavender rounded-lg transition-colors disabled:opacity-50"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}