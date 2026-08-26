'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { Stempel, useStempel } from '@/components/Stempel'
import { ReceiptModal } from '@/components/Receipt'
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Package, Loader2,
  ScanBarcode, Banknote, QrCode, ChevronLeft, Check,
} from 'lucide-react'

type Product = {
  id: string
  name: string
  stock: number
  unit: string
  price: number
  barcode?: string | null
}

type CartItem = {
  product_id: string
  name: string
  qty: number
  price: number
  maxStock: number
}

type PaymentMethod = 'cash' | 'qris'

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { value: 'cash', label: 'Tunai', icon: Banknote },
  { value: 'qris', label: 'QRIS', icon: QrCode },
]

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

  // ===== Scan barcode (manual / scanner USB) =====
  const [barcodeInput, setBarcodeInput] = useState('')
  const [scanError, setScanError] = useState('')
  const barcodeRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const paidInputRef = useRef<HTMLInputElement>(null)

  // ===== Pembayaran =====
  const [step, setStep] = useState<'cart' | 'payment'>('cart')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [paidAmountInput, setPaidAmountInput] = useState('')

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

  useEffect(() => {
    // Auto-fokus ke kolom barcode cuma di layar besar (laptop/PC pakai scanner USB).
    // Di HP sengaja tidak di-fokus otomatis biar keyboard on-screen tidak langsung muncul.
    if (window.matchMedia('(min-width: 1024px)').matches) {
      barcodeRef.current?.focus()
    }
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

  function clearCart() {
    if (cart.length === 0) return
    if (!confirm('Kosongkan semua barang di keranjang?')) return
    setCart([])
  }

  const total = useMemo(() => cart.reduce((sum, i) => sum + i.qty * i.price, 0), [cart])

  // ===== Scan barcode: cari produk lalu masukkan ke keranjang =====
  function lookupAndAddByBarcode(codeRaw: string): { ok: true; name: string } | { ok: false; message: string } {
    const code = codeRaw.trim()
    if (!code) return { ok: false, message: 'Barcode kosong' }

    const found = products.find((p) => (p.barcode || '').trim().toLowerCase() === code.toLowerCase())
    if (!found) {
      return { ok: false, message: `Barcode "${code}" tidak dikenali` }
    }
    if (found.stock <= 0) {
      return { ok: false, message: `${found.name} — stok habis` }
    }

    addToCart(found)
    return { ok: true, name: found.name }
  }

  function handleBarcodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    const code = barcodeInput
    setBarcodeInput('')
    const result = lookupAndAddByBarcode(code)
    if (result.ok) {
      stempel.show(`+ ${result.name}`)
    } else {
      setScanError(result.message)
      setTimeout(() => setScanError(''), 2200)
    }
  }

  // ===== Kalkulator kembalian =====
  const paidAmount = useMemo(() => {
    if (paymentMethod !== 'cash') return total
    const n = Number(paidAmountInput)
    return isNaN(n) ? 0 : n
  }, [paymentMethod, paidAmountInput, total])

  const changeAmount = paidAmount - total
  const canConfirmPayment = paymentMethod !== 'cash' || (paidAmountInput !== '' && changeAmount >= 0)

  const quickCashOptions = useMemo(() => {
    if (total <= 0) return []
    const denominations = [5000, 10000, 20000, 50000, 100000, 150000, 200000]
    const candidates = denominations.filter((d) => d >= total)
    const roundedUp = Math.ceil(total / 50000) * 50000
    if (roundedUp > 0 && !candidates.includes(roundedUp)) candidates.push(roundedUp)
    return Array.from(new Set(candidates)).sort((a, b) => a - b).slice(0, 3)
  }, [total])

  function goToPayment() {
    if (cart.length === 0) return
    setPaymentMethod('cash')
    setPaidAmountInput('')
    setStep('payment')
  }

  function backToCart() {
    setStep('cart')
  }

  async function handleCheckout() {
    if (cart.length === 0) return
    if (paymentMethod === 'cash' && !canConfirmPayment) return

    setIsCheckingOut(true)
    try {
      const res = await fetch('/api/kasir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          payment_method: paymentMethod,
          paid_amount: paymentMethod === 'cash' ? paidAmount : total,
        }),
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
        paymentMethod: result.payment_method,
        paidAmount: result.paid_amount,
        changeAmount: result.change_amount,
      })
      setCart([])
      setStep('cart')
      setPaidAmountInput('')
      await fetchProducts()
      if (window.matchMedia('(min-width: 1024px)').matches) {
        setTimeout(() => barcodeRef.current?.focus(), 100)
      }
    } catch (err) {
      alert('Terjadi kesalahan, coba lagi')
    } finally {
      setIsCheckingOut(false)
    }
  }

  // ===== Shortcut keyboard (khusus laptop/PC — otomatis tidak berlaku di HP): F2 cari, F3 barcode manual, F4 kosongkan, F9 bayar, Esc kembali =====
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (receiptData) return

    if (e.key === 'F2') {
      e.preventDefault()
      setStep('cart')
      searchRef.current?.focus()
    } else if (e.key === 'F3') {
      e.preventDefault()
      setStep('cart')
      barcodeRef.current?.focus()
    } else if (e.key === 'F4') {
      e.preventDefault()
      if (step === 'cart') clearCart()
    } else if (e.key === 'F9') {
      e.preventDefault()
      if (step === 'cart') {
        goToPayment()
      } else if (canConfirmPayment && !isCheckingOut) {
        handleCheckout()
      }
    } else if (e.key === 'Escape') {
      if (step === 'payment') {
        e.preventDefault()
        backToCart()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, cart, canConfirmPayment, isCheckingOut, receiptData])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    if (step === 'payment' && paymentMethod === 'cash') {
      setTimeout(() => paidInputRef.current?.focus(), 50)
    }
  }, [step, paymentMethod])

  return (
    <DashboardShell>
      <Stempel visible={stempel.visible} label={stempel.label} />
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full pb-8 lg:pb-24">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink tracking-tight">Kasir</h1>
          <p className="text-sm text-muted mt-1">Scan barcode atau klik barang — otomatis tercatat sebagai transaksi</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* KOLOM KIRI: Scan + Daftar Produk */}
          <div className="lg:col-span-2">

            {/* Scan barcode (manual / scanner USB) */}
            <form onSubmit={handleBarcodeSubmit} className="mb-3">
              <div className={`relative rounded-xl transition-all ${scanError ? 'ring-2 ring-red-400' : 'focus-within:ring-2 focus-within:ring-primary/40'}`}>
                <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 text-primary w-5 h-5" />
                <input
                  ref={barcodeRef}
                  type="text"
                  placeholder="Scan atau ketik barcode barang..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-white rounded-xl text-sm font-mono outline-none shadow-sm"
                  autoComplete="off"
                />
              </div>
              {scanError && <p className="text-xs text-red-600 font-medium mt-1.5 ml-1">{scanError}</p>}
            </form>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Atau cari nama barang..."
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

          {/* KOLOM KANAN: Keranjang / Pembayaran */}
          <div className="lg:col-span-1 sticky top-6">
            <div className="bg-white rounded-2xl shadow-sm p-5">

              {step === 'cart' ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-ink flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-primary" /> Keranjang
                    </h2>
                    {cart.length > 0 && (
                      <button
                        onClick={clearCart}
                        className="text-xs font-medium text-muted hover:text-red-600 transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Kosongkan
                      </button>
                    )}
                  </div>

                  {cart.length === 0 ? (
                    <p className="text-sm text-muted text-center py-8">Scan barcode atau klik barang di sebelah kiri untuk menambah ke keranjang</p>
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
                        onClick={goToPayment}
                        className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-xl py-3 text-sm font-bold transition-colors shadow-sm shadow-primary/30"
                      >
                        <ShoppingCart className="w-4 h-4" /> Lanjut Bayar
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  {/* ===== Layar Pembayaran ===== */}
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      onClick={backToCart}
                      className="p-1.5 -ml-1.5 text-muted hover:text-ink hover:bg-lavender/60 rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <h2 className="text-base font-bold text-ink">Pembayaran</h2>
                  </div>

                  <div className="bg-lavender/40 rounded-xl p-4 mb-4 text-center">
                    <p className="text-xs text-muted mb-1">Total Belanja</p>
                    <p className="text-2xl font-black text-ink">{formatRupiah(total)}</p>
                  </div>

                  <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Metode Bayar</p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {PAYMENT_OPTIONS.map((opt) => {
                      const Icon = opt.icon
                      const active = paymentMethod === opt.value
                      return (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setPaymentMethod(opt.value)
                            setPaidAmountInput('')
                          }}
                          className={`flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-bold transition-all ${
                            active
                              ? 'bg-primary text-white shadow-sm shadow-primary/30'
                              : 'bg-lavender/50 text-muted hover:bg-lavender'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>

                  {paymentMethod === 'cash' ? (
                    <>
                      <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2">Uang Diterima</p>
                      <input
                        ref={paidInputRef}
                        type="number"
                        min={0}
                        placeholder="Masukkan jumlah uang tunai"
                        value={paidAmountInput}
                        onChange={(e) => setPaidAmountInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && canConfirmPayment) handleCheckout() }}
                        className="w-full px-4 py-3 bg-lavender/40 border border-transparent rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white transition-colors mb-2"
                      />

                      <div className="flex flex-wrap gap-2 mb-4">
                        <button
                          onClick={() => setPaidAmountInput(String(total))}
                          className="px-3 py-1.5 bg-lavender/60 hover:bg-lavender text-ink text-xs font-bold rounded-lg transition-colors"
                        >
                          Uang Pas
                        </button>
                        {quickCashOptions.map((amt) => (
                          <button
                            key={amt}
                            onClick={() => setPaidAmountInput(String(amt))}
                            className="px-3 py-1.5 bg-lavender/60 hover:bg-lavender text-ink text-xs font-bold rounded-lg transition-colors"
                          >
                            {formatRupiah(amt)}
                          </button>
                        ))}
                      </div>

                      <div className={`rounded-xl p-4 mb-4 flex justify-between items-center ${
                        paidAmountInput === '' ? 'bg-lavender/30' : changeAmount >= 0 ? 'bg-primary-light' : 'bg-red-50'
                      }`}>
                        <span className={`text-sm font-medium ${paidAmountInput !== '' && changeAmount < 0 ? 'text-red-600' : 'text-muted'}`}>
                          {paidAmountInput !== '' && changeAmount < 0 ? 'Uang kurang' : 'Kembalian'}
                        </span>
                        <span className={`text-lg font-black ${
                          paidAmountInput === '' ? 'text-muted' : changeAmount >= 0 ? 'text-primary' : 'text-red-600'
                        }`}>
                          {paidAmountInput === '' ? '—' : formatRupiah(Math.abs(changeAmount))}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="bg-primary-light rounded-xl p-4 mb-4 flex items-center gap-2.5 text-sm text-ink">
                      <Check className="w-4 h-4 text-primary shrink-0" />
                      Pembayaran QRIS sejumlah tagihan penuh, tanpa kembalian.
                    </div>
                  )}

                  <button
                    onClick={handleCheckout}
                    disabled={isCheckingOut || !canConfirmPayment}
                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-xl py-3.5 text-sm font-bold transition-colors disabled:opacity-50 shadow-sm shadow-primary/30"
                  >
                    {isCheckingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {isCheckingOut ? 'Memproses...' : 'Selesaikan & Bayar'}
                  </button>
                </>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Bar shortcut keyboard — cuma buat laptop/PC (ada tombol F1-F12), disembunyikan total di HP/tablet */}
      <div className="hidden lg:block fixed bottom-0 inset-x-0 lg:pl-64 z-40 pointer-events-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
          <div className="pointer-events-auto bg-ink text-white/90 rounded-xl shadow-lg px-4 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] font-medium justify-center sm:justify-start">
            <span><kbd className="px-1.5 py-0.5 bg-white/15 rounded font-mono">F2</kbd> Cari Barang</span>
            <span><kbd className="px-1.5 py-0.5 bg-white/15 rounded font-mono">F3</kbd> Barcode Manual</span>
            <span><kbd className="px-1.5 py-0.5 bg-white/15 rounded font-mono">F4</kbd> Kosongkan</span>
            <span><kbd className="px-1.5 py-0.5 bg-white/15 rounded font-mono">F9</kbd> Bayar</span>
            <span><kbd className="px-1.5 py-0.5 bg-white/15 rounded font-mono">Esc</kbd> Kembali</span>
          </div>
        </div>
      </div>

      {receiptData && (
        <ReceiptModal data={receiptData} onClose={() => setReceiptData(null)} />
      )}
    </DashboardShell>
  )
}