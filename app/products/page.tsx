'use client'

import { useEffect, useState, useTransition, useMemo } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { Stempel, useStempel } from '@/components/Stempel'
import {
  Package, Trash2, PlusCircle, MinusCircle, Search, ChevronLeft, ChevronRight,
  SlidersHorizontal, Boxes, AlertTriangle, Wallet, PackagePlus, Barcode, Pencil, Check, X, Loader2, Plus,
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
  
  // State untuk Modal Tambah Barang Baru
  const [isModalOpen, setIsModalOpen] = useState(false)

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
        setIsModalOpen(false)
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
      <div className="w-full pb-16 lg:pb-10">

        {/* ===================== HEADER ===================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[24px] font-extrabold tracking-tight text-ink m-0">Stok Barang Warung</h1>
            <p className="text-mu mt-1 text-[14px]">Kelola dan pantau ketersediaan barang dengan mudah</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-br hover:brightness-110 text-white px-4 py-2.5 rounded-[14px] text-[14px] font-bold transition-all shadow-[0_6px_14px_rgba(30,155,80,0.25)] shrink-0"
          >
            <Plus className="w-4 h-4" /> Tambah Barang
          </button>
        </div>

        {/* ===================== RINGKASAN (KPI) ===================== */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div className="bg-card border border-ln rounded-[18px] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-mu uppercase tracking-wider">Jenis Barang</span>
              <div className="w-8 h-8 rounded-[10px] bg-so text-br flex items-center justify-center"><Boxes className="w-4 h-4" /></div>
            </div>
            <p className="text-[20px] font-extrabold text-ink">{summary.totalJenis} Jenis</p>
          </div>

          <div className={`rounded-[18px] p-4 shadow-sm border ${summary.stokTipis > 0 ? 'bg-rs border-rd/30' : 'bg-card border-ln'}`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs font-bold uppercase tracking-wider ${summary.stokTipis > 0 ? 'text-rd' : 'text-mu'}`}>Stok Tipis</span>
              <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center ${summary.stokTipis > 0 ? 'bg-rd text-white' : 'bg-so text-br'}`}>
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <p className={`text-[20px] font-extrabold ${summary.stokTipis > 0 ? 'text-rd' : 'text-ink'}`}>{summary.stokTipis} Barang</p>
          </div>

          <div className="bg-card border border-ln rounded-[18px] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-mu uppercase tracking-wider">Total Nilai Stok</span>
              <div className="w-8 h-8 rounded-[10px] bg-so text-br flex items-center justify-center"><Wallet className="w-4 h-4" /></div>
            </div>
            <p className="text-[20px] font-extrabold text-ink">{formatRupiah(summary.totalNilai)}</p>
          </div>
        </div>

        {/* ===================== FILTER & PENCARIAN & DAFTAR BARANG (FULL WIDTH) ===================== */}
        <div className="space-y-4">

          {/* Filter & Pencarian */}
          <div className="bg-card border border-ln rounded-[18px] p-4 shadow-sm flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mu w-4 h-4" />
              <input
                type="text"
                placeholder="Cari nama barang..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-card border border-ln rounded-[14px] text-sm text-ink outline-none focus:border-br transition-colors shadow-sm"
              />
            </div>
            <div className="relative w-full sm:w-52">
              <SlidersHorizontal className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mu w-4 h-4" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-card border border-ln rounded-[14px] text-sm text-ink outline-none appearance-none transition-colors cursor-pointer shadow-sm"
              >
                <option value="newest">Baru Ditambahkan</option>
                <option value="name_asc">Nama (A-Z)</option>
                <option value="stock_asc">Stok Paling Sedikit</option>
                <option value="stock_desc">Stok Paling Banyak</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse bg-card border border-ln h-44 rounded-[18px] w-full"></div>
              ))}
            </div>
          ) : paginatedProducts.length === 0 ? (
            <div className="bg-card border border-ln rounded-[18px] py-16 flex flex-col items-center justify-center text-center px-4">
              <Package className="h-10 w-10 text-mu mb-2 opacity-40" />
              <p className="text-ink font-bold text-sm">Tidak ada barang ditemukan</p>
              <p className="text-mu text-xs mt-1">Coba sesuaikan kata kunci pencarian atau tambah barang baru.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {paginatedProducts.map((p) => {
                  const isUpdating = updatingIds.has(p.id)
                  const isDeleting = deletingId === p.id
                  const isRestocking = restockingId === p.id

                  return (
                    <div
                      key={p.id}
                      className={`bg-card border border-ln rounded-[18px] p-4 sm:p-5 shadow-sm flex flex-col justify-between hover:border-br/50 transition-all ${isDeleting ? 'opacity-50' : ''}`}
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <div>
                            <h3 className="font-bold text-ink text-[15px] leading-snug mb-0.5">{p.name}</h3>
                            <p className="text-[13px] font-bold text-br">
                              {Number(p.price) > 0 ? formatRupiah(Number(p.price)) : 'Harga belum diatur'}
                            </p>
                          </div>
                          {p.stock <= LOW_STOCK_THRESHOLD && (
                            <span className="px-2 py-0.5 bg-rs text-rd text-[10px] uppercase font-extrabold rounded-md shrink-0 border border-rd/20">
                              Stok Tipis
                            </span>
                          )}
                        </div>

                        {/* Harga Modal Inline Edit */}
                        <div className="mb-2">
                          {editingCostPriceId === p.id ? (
                            <div className="flex items-center gap-1.5 mt-2">
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
                                className="min-w-0 flex-1 px-3 py-1.5 bg-card border border-ln rounded-[10px] text-xs text-ink font-bold outline-none focus:border-br"
                              />
                              <button
                                onClick={() => handleSaveCostPrice(p.id)}
                                disabled={savingCostPrice}
                                className="p-1.5 bg-br text-white rounded-lg transition-colors shrink-0"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingCostPriceId(null)}
                                className="p-1.5 bg-bg border border-ln text-mu hover:text-rd rounded-lg transition-colors shrink-0"
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
                              className="flex items-center gap-1.5 text-xs text-mu hover:text-br transition-colors group py-0.5"
                            >
                              <Wallet className="w-3.5 h-3.5 shrink-0" />
                              {Number(p.cost_price) > 0 ? (
                                <span className="font-semibold">Modal: {formatRupiah(Number(p.cost_price))}</span>
                              ) : (
                                <span className="italic">Atur harga modal</span>
                              )}
                              <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          )}
                        </div>

                        {/* Barcode Inline Edit */}
                        <div className="mb-3">
                          {editingBarcodeId === p.id ? (
                            <div className="flex items-center gap-1.5 mt-2">
                              <input
                                autoFocus
                                type="text"
                                value={editingBarcodeValue}
                                onChange={(e) => setEditingBarcodeValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveBarcode(p.id)
                                  if (e.key === 'Escape') setEditingBarcodeId(null)
                                }}
                                placeholder="Ketik barcode"
                                className="min-w-0 flex-1 px-3 py-1.5 bg-card border border-ln rounded-[10px] text-xs text-ink font-mono outline-none focus:border-br"
                              />
                              <button
                                onClick={() => handleSaveBarcode(p.id)}
                                disabled={savingBarcode}
                                className="p-1.5 bg-br text-white rounded-lg transition-colors shrink-0"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingBarcodeId(null)}
                                className="p-1.5 bg-bg border border-ln text-mu hover:text-rd rounded-lg transition-colors shrink-0"
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
                              className="flex items-center gap-1.5 text-xs text-mu hover:text-br transition-colors group py-0.5"
                            >
                              <Barcode className="w-3.5 h-3.5 shrink-0" />
                              {p.barcode ? (
                                <span className="font-mono font-semibold">{p.barcode}</span>
                              ) : (
                                <span className="italic">Tambah barcode</span>
                              )}
                              <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Kontrol Stok */}
                      <div className="border-t border-ln pt-3 mt-auto space-y-3">
                        <div className="flex items-end justify-between">
                          <div className="flex items-baseline gap-1">
                            <span className="text-[22px] font-extrabold text-ink tabular-nums">{p.stock}</span>
                            <span className="text-xs font-bold text-mu">{p.unit}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center gap-0.5 bg-bg border border-ln p-1 rounded-[12px]">
                              <button
                                onClick={() => handleUpdateStock(p.id, -1)}
                                disabled={isUpdating || p.stock <= 0}
                                className="w-7 h-7 flex items-center justify-center text-ink hover:bg-so rounded-lg transition-colors disabled:opacity-40"
                              >
                                <MinusCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleUpdateStock(p.id, 1)}
                                disabled={isUpdating}
                                className="w-7 h-7 flex items-center justify-center text-ink hover:bg-so rounded-lg transition-colors disabled:opacity-40"
                              >
                                <PlusCircle className="w-4 h-4" />
                              </button>
                            </div>
                            <button
                              onClick={() => setRestockingId(isRestocking ? null : p.id)}
                              className="w-9 h-9 bg-so border border-br/20 text-br hover:bg-br hover:text-white rounded-[12px] flex items-center justify-center transition-colors shadow-sm"
                              title="Restock cepat"
                            >
                              <PackagePlus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              disabled={isDeleting}
                              className="w-9 h-9 bg-rs border border-rd/20 text-rd hover:bg-rd hover:text-white rounded-[12px] flex items-center justify-center transition-colors disabled:opacity-50"
                              title="Hapus produk"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {isRestocking && (
                          <div className="flex items-center gap-2 bg-bg border border-ln rounded-[14px] p-2">
                            <input
                              type="number"
                              min={1}
                              autoFocus
                              placeholder={`Tambah ${p.unit}...`}
                              value={restockAmount}
                              onChange={(e) => setRestockAmount(e.target.value)}
                              className="flex-1 px-3 py-2 bg-card border border-ln rounded-[10px] text-xs font-bold text-ink outline-none focus:border-br"
                            />
                            <button
                              onClick={() => handleBulkRestock(p.id)}
                              className="bg-br hover:brightness-110 text-white px-3.5 py-2 rounded-[10px] text-xs font-bold transition-all shadow-sm"
                            >
                              Tambah
                            </button>
                            <button
                              onClick={() => { setRestockingId(null); setRestockAmount('') }}
                              className="text-mu hover:text-ink px-2 py-2 text-xs font-bold transition-colors"
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
                <div className="flex items-center justify-between mt-5 bg-card border border-ln p-4 rounded-[18px] shadow-sm">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="flex items-center gap-1 px-3.5 py-2 text-xs font-bold text-ink bg-bg border border-ln hover:bg-so rounded-[10px] transition-colors disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" /> Sebelumnya
                  </button>
                  <span className="text-xs font-bold text-mu">
                    Halaman <span className="text-ink">{currentPage}</span> dari {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="flex items-center gap-1 px-3.5 py-2 text-xs font-bold text-ink bg-bg border border-ln hover:bg-so rounded-[10px] transition-colors disabled:opacity-50"
                  >
                    Berikutnya <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}

        </div>

        {/* ===================== MODAL TAMBAH BARANG BARU ===================== */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-card border border-ln rounded-[22px] w-full max-w-lg p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-ln">
                <h2 className="text-[18px] font-extrabold text-ink m-0">Tambah Barang Baru</h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-bg border border-ln flex items-center justify-center text-mu hover:text-ink hover:bg-so transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">Nama barang</label>
                  <input
                    type="text"
                    placeholder="Contoh: Indomie Goreng"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={60}
                    className="w-full px-4 py-3 bg-card border border-ln rounded-[14px] text-sm text-ink outline-none focus:border-br transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1.5">Stok awal</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      className="w-full px-4 py-3 bg-card border border-ln rounded-[14px] text-sm text-ink outline-none focus:border-br transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1.5">Satuan</label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full px-4 py-3 bg-card border border-ln rounded-[14px] text-sm text-ink outline-none focus:border-br transition-colors appearance-none cursor-pointer"
                    >
                      {COMMON_UNITS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1.5">Harga modal</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="Rp 0"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      className="w-full px-4 py-3 bg-card border border-ln rounded-[14px] text-sm text-ink outline-none focus:border-br transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1.5">Harga jual</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="Rp 0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full px-4 py-3 bg-card border border-ln rounded-[14px] text-sm text-ink outline-none focus:border-br transition-colors"
                    />
                  </div>
                </div>

                {Number(price) > 0 && Number(costPrice) > 0 && (
                  <p className={`text-xs font-bold px-1 ${Number(price) - Number(costPrice) >= 0 ? 'text-br' : 'text-rd'}`}>
                    Estimasi untung: {formatRupiah(Number(price) - Number(costPrice))} per satuan
                  </p>
                )}

                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">Barcode (Opsional)</label>
                  <div className="relative">
                    <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mu w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Scan atau ketik barcode..."
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-card border border-ln rounded-[14px] text-sm text-ink outline-none focus:border-br transition-colors font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPending || !name.trim()}
                  className="w-full mt-2 bg-br hover:brightness-110 text-white rounded-[14px] py-3.5 text-sm font-bold transition-all disabled:opacity-50 flex justify-center items-center gap-2 shadow-[0_6px_14px_rgba(30,155,80,0.25)]"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {isPending ? 'Menyimpan...' : 'Simpan Barang'}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardShell>
  )
}