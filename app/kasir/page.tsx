'use client'

import { useEffect, useState, useMemo } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { Stempel, useStempel } from '@/components/Stempel'
import { ReceiptModal } from '@/components/Receipt'
import { Search, Plus, Minus, Trash2, ShoppingCart, Package, Loader2 } from 'lucide-react'

type Product = {
  id: string
  name: string
  stock: number
  unit: string
  price: number
}

type CartItem = {
  product_id: string
  name: string
  qty: number
  price: number
  maxStock: number
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

export default function KasirPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [receiptData, setReceiptData] = useState<any>(null)
  const stempel = useStempel()

  async function fetchProducts() {
    setLoading(true)
    try {
      const res = await fetch('/api/products').then((r) => r.json())
      setProducts(res || [])
    } catch (err) {
      console.error('Gagal memuat produk', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products
    const q = searchQuery.toLowerCase()
    return products.filter((p) => p.name.toLowerCase().includes(q))
  }, [products, searchQuery])

  function addToCart(product: Product) {
    if (product.stock <= 0) return alert('Stok barang ini habis')

    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id)
      if (existing) {
        if (existing.qty >= product.stock) {
          alert('Stok tidak mencukupi')
          return prev
        }
        return prev.map((i) => i.product_id === product.id ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, { product_id: product.id, name: product.name, qty: 1, price: Number(product.price), maxStock: product.stock }]
    })
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.product_id !== productId) return i
          const newQty = i.qty + delta
          if (newQty > i.maxStock) {
            alert('Stok tidak mencukupi')
            return i
          }
          return { ...i, qty: newQty }
        })
        .filter((i) => i.qty > 0)
    )
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((i) => i.product_id !== productId))
  }

  const total = useMemo(() => cart.reduce((sum, i) => sum + i.qty * i.price, 0), [cart])

  async function handleCheckout() {
    if (cart.length === 0) return
    setIsCheckingOut(true)
    try {
      const res = await fetch('/api/kasir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart }),
      })
      const result = await res.json()

      if (!res.ok) {
        alert('Gagal menyelesaikan transaksi: ' + result.error)
        return
      }

      stempel.show('Terjual')
      setReceiptData({
        storeName: 'Buku Warung',
        items: cart.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
        total,
        date: new Date(),
        transactionId: result.transaction_id,
      })
      setCart([])
      await fetchProducts()
    } catch (err) {
      alert('Terjadi kesalahan, coba lagi')
    } finally {
      setIsCheckingOut(false)
    }
  }

  return (
    <DashboardShell>
      <Stempel visible={stempel.visible} label={stempel.label} />
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink tracking-tight">Kasir Cepat</h1>
          <p className="text-sm text-muted mt-1">Jual barang langsung dari stok — otomatis tercatat sebagai transaksi</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* KOLOM KIRI: Daftar Produk */}
          <div className="lg:col-span-2">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
              <input
                type="text"
                placeholder="Cari barang..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-3 bg-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
              />
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="animate-pulse bg-white/60 h-24 rounded-xl w-full"></div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white/60 border-2 border-dashed border-borderc rounded-2xl py-12 flex flex-col items-center justify-center text-center">
                <Package className="h-10 w-10 text-borderc mb-2" />
                <p className="text-muted text-sm">Tidak ada barang yang cocok. Tambah dulu di halaman Stok.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={p.stock <= 0}
                    className="bg-white rounded-xl p-3.5 text-left shadow-sm hover:shadow-md hover:ring-2 hover:ring-primary/30 transition-all disabled:opacity-40 disabled:hover:ring-0 disabled:hover:shadow-sm"
                  >
                    <p className="text-sm font-bold text-ink leading-tight mb-1 line-clamp-2">{p.name}</p>
                    <p className="text-xs text-muted mb-2">{formatRupiah(p.price)}</p>
                    <p className={`text-[11px] font-medium ${p.stock <= 3 ? 'text-red-600' : 'text-primary'}`}>
                      Stok: {p.stock} {p.unit}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* KOLOM KANAN: Keranjang */}
          <div className="lg:col-span-1 sticky top-6">
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h2 className="text-base font-bold text-ink mb-4 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-primary" /> Keranjang
              </h2>

              {cart.length === 0 ? (
                <p className="text-sm text-muted text-center py-8">Klik barang di sebelah kiri untuk menambah ke keranjang</p>
              ) : (
                <>
                  <div className="space-y-3 mb-4 max-h-80 overflow-y-auto pr-1">
                    {cart.map((item) => (
                      <div key={item.product_id} className="flex items-center justify-between gap-2 bg-lavender/40 rounded-lg p-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-ink truncate">{item.name}</p>
                          <p className="text-xs text-muted">{formatRupiah(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => updateQty(item.product_id, -1)}
                            className="p-1 text-muted hover:text-ink hover:bg-white rounded transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-sm font-bold text-ink w-5 text-center">{item.qty}</span>
                          <button
                            onClick={() => updateQty(item.product_id, 1)}
                            className="p-1 text-muted hover:text-ink hover:bg-white rounded transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.product_id)}
                            className="p-1 text-muted hover:text-red-600 hover:bg-white rounded transition-colors ml-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-lavender pt-4 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted">Total</span>
                      <span className="text-xl font-black text-primary">{formatRupiah(total)}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={isCheckingOut}
                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-xl py-3 text-sm font-bold transition-colors disabled:opacity-50 shadow-sm shadow-primary/30"
                  >
                    {isCheckingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                    {isCheckingOut ? 'Memproses...' : 'Selesaikan Transaksi'}
                  </button>
                </>
              )}
            </div>
          </div>

        </div>
      </div>

      {receiptData && (
        <ReceiptModal data={receiptData} onClose={() => setReceiptData(null)} />
      )}
    </DashboardShell>
  )
}