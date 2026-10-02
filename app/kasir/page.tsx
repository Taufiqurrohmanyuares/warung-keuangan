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

  const [barcodeInput, setBarcodeInput] = useState('')
  const [scanError, setScanError] = useState('')
  const barcodeRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const paidInputRef = useRef<HTMLInputElement>(null)

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
        storeName: 'Warung Keuangan',
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
      <div className="w-full pb-16 lg:pb-10">

        {/* ===================== HEADER ===================== */}
        <div className="mb-5">
          <h1 className="text-[24px] font-extrabold tracking-tight text-ink m-0">Kasir Toko</h1>
          <p className="text-mu mt-1 text-[14px]">Scan barcode atau pilih barang untuk mencatat transaksi secara instan</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

          {/* ===================== KOLOM KIRI: SCAN & PRODUK ===================== */}
          <div className="lg:col-span-2 space-y-4">

            {/* Input Barcode */}
            <form onSubmit={handleBarcodeSubmit}>
              <div className={`relative rounded-[14px] transition-all bg-card border ${scanError ? 'border-rd' : 'border-ln focus-within:border-br'}`}>
                <ScanBarcode className="absolute left-3.5 top-1/2 -translate-y-1/2 text-br w-5 h-5" />
                <input
                  ref={barcodeRef}
                  type="text"
                  placeholder="Scan barcode barang atau ketik manual..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-transparent rounded-[14px] text-sm font-mono text-ink outline-none"
                  autoComplete="off"
                />
              </div>
              {scanError && <p className="text-xs text-rd font-medium mt-1.5 ml-1">{scanError}</p>}
            </form>

            {/* Kolom Cari Nama Barang */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mu w-4 h-4" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Cari berdasarkan nama barang..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-card border border-ln rounded-[14px] text-sm text-ink outline-none focus:border-br transition-colors shadow-sm"
              />
            </div>

            {/* Daftar Produk Grid */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="animate-pulse bg-card border border-ln h-[100px] rounded-[16px] w-full"></div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-card border border-ln rounded-[18px] py-14 flex flex-col items-center justify-center text-center px-4">
                <Package className="h-10 w-10 text-mu mb-2 opacity-50" />
                <p className="text-ink font-bold text-sm">Barang tidak ditemukan</p>
                <p className="text-mu text-xs mt-1">Pastikan Anda sudah menambahkan produk di menu Stok.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={p.stock <= 0}
                    className="bg-card border border-ln rounded-[16px] p-3.5 text-left shadow-sm hover:border-br hover:bg-so/40 transition-all disabled:opacity-40 disabled:hover:border-ln disabled:hover:bg-card flex flex-col justify-between"
                  >
                    <div>
                      <p className="text-[13px] font-bold text-ink leading-snug mb-1 line-clamp-2">{p.name}</p>
                      <p className="text-[12px] font-bold text-br">{formatRupiah(p.price)}</p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-ln/60 flex items-center justify-between">
                      <span className={`text-[11px] font-bold ${p.stock <= 3 ? 'text-rd' : 'text-mu'}`}>
                        Stok: {p.stock} {p.unit}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ===================== KOLOM KANAN: KERANJANG & PEMBAYARAN ===================== */}
          <div className="lg:col-span-1 sticky top-6">
            <div className="bg-card border border-ln rounded-[18px] p-5 shadow-sm">

              {step === 'cart' ? (
                <>
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-ln">
                    <h2 className="text-[15px] font-bold text-ink flex items-center gap-2 m-0">
                      <ShoppingCart className="w-4 h-4 text-br" /> Keranjang Belanja
                    </h2>
                    {cart.length > 0 && (
                      <button
                        onClick={clearCart}
                        className="text-xs font-bold text-rd hover:underline flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Kosongkan
                      </button>
                    )}
                  </div>

                  {cart.length === 0 ? (
                    <div className="py-12 text-center">
                      <ShoppingCart className="w-10 h-10 text-mu/30 mx-auto mb-2" />
                      <p className="text-sm text-mu font-medium">Keranjang masih kosong</p>
                      <p className="text-xs text-mu/70 mt-0.5">Pilih produk di samping untuk mulai transaksi.</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2.5 mb-4 max-h-[320px] overflow-y-auto pr-1">
                        {cart.map((item) => (
                          <div key={item.product_id} className="flex items-center justify-between gap-2 bg-bg rounded-[12px] p-2.5 border border-ln/60">
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-bold text-ink truncate">{item.name}</p>
                              <p className="text-[11px] text-mu">{formatRupiah(item.price)}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => updateQty(item.product_id, -1)}
                                className="w-7 h-7 bg-card border border-ln text-ink rounded-lg flex items-center justify-center hover:bg-so transition-colors"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-sm font-bold text-ink w-5 text-center">{item.qty}</span>
                              <button
                                onClick={() => updateQty(item.product_id, 1)}
                                className="w-7 h-7 bg-card border border-ln text-ink rounded-lg flex items-center justify-center hover:bg-so transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => removeFromCart(item.product_id)}
                                className="p-1.5 text-mu hover:text-rd transition-colors ml-0.5"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-ln pt-3.5 mb-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-mu">Total Pembayaran</span>
                          <span className="text-[18px] font-extrabold text-br">{formatRupiah(total)}</span>
                        </div>
                      </div>

                      <button
                        onClick={goToPayment}
                        className="w-full flex items-center justify-center gap-2 bg-br hover:brightness-110 text-white rounded-[14px] py-3.5 text-sm font-bold transition-all shadow-[0_6px_14px_rgba(30,155,80,0.25)]"
                      >
                        <ShoppingCart className="w-4 h-4" /> Lanjut ke Pembayaran
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  {/* ================= LAYAR PEMBAYARAN ================= */}
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-ln">
                    <button
                      onClick={backToCart}
                      className="w-8 h-8 rounded-lg bg-bg border border-ln flex items-center justify-center text-ink hover:bg-so transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <h2 className="text-[15px] font-bold text-ink m-0">Metode Pembayaran</h2>
                  </div>

                  <div className="bg-bg border border-ln rounded-[14px] p-3.5 mb-4 text-center">
                    <p className="text-xs text-mu mb-0.5 font-medium">Total Tagihan</p>
                    <p className="text-[22px] font-extrabold text-ink">{formatRupiah(total)}</p>
                  </div>

                  <p className="text-[12px] font-bold text-mu uppercase tracking-wider mb-2">Pilih Pembayaran</p>
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
                          className={`flex flex-col items-center gap-1.5 py-3 rounded-[12px] text-[13px] font-bold border transition-all ${
                            active
                              ? 'bg-br text-white border-br shadow-sm'
                              : 'bg-card text-ink border-ln hover:bg-so/50'
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
                      <p className="text-[12px] font-bold text-mu uppercase tracking-wider mb-2">Uang Diterima dari Pelanggan</p>
                      <input
                        ref={paidInputRef}
                        type="number"
                        min={0}
                        placeholder="Masukkan nominal tunai"
                        value={paidAmountInput}
                        onChange={(e) => setPaidAmountInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && canConfirmPayment) handleCheckout() }}
                        className="w-full px-4 py-3 bg-card border border-ln rounded-[14px] text-sm font-bold text-ink outline-none focus:border-br transition-colors mb-2.5"
                      />

                      <div className="flex flex-wrap gap-1.5 mb-4">
                        <button
                          onClick={() => setPaidAmountInput(String(total))}
                          className="px-3 py-1.5 bg-bg border border-ln hover:bg-so text-ink text-xs font-bold rounded-lg transition-colors"
                        >
                          Uang Pas
                        </button>
                        {quickCashOptions.map((amt) => (
                          <button
                            key={amt}
                            onClick={() => setPaidAmountInput(String(amt))}
                            className="px-3 py-1.5 bg-bg border border-ln hover:bg-so text-ink text-xs font-bold rounded-lg transition-colors"
                          >
                            {formatRupiah(amt)}
                          </button>
                        ))}
                      </div>

                      <div className={`rounded-[14px] p-3.5 mb-4 flex justify-between items-center border ${
                        paidAmountInput === '' ? 'bg-bg border-ln' : changeAmount >= 0 ? 'bg-so border-br/30' : 'bg-rs border-rd/30'
                      }`}>
                        <span className={`text-xs font-bold ${paidAmountInput !== '' && changeAmount < 0 ? 'text-rd' : 'text-mu'}`}>
                          {paidAmountInput !== '' && changeAmount < 0 ? 'Uang kurang' : 'Kembalian'}
                        </span>
                        <span className={`text-[15px] font-extrabold ${
                          paidAmountInput === '' ? 'text-mu' : changeAmount >= 0 ? 'text-br' : 'text-rd'
                        }`}>
                          {paidAmountInput === '' ? '—' : formatRupiah(Math.abs(changeAmount))}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="bg-so border border-br/30 rounded-[14px] p-3.5 mb-4 flex items-center gap-2.5 text-xs text-ink font-medium">
                      <Check className="w-4 h-4 text-br shrink-0" />
                      Pembayaran via QRIS sesuai total tagihan tanpa kembalian.
                    </div>
                  )}

                  <button
                    onClick={handleCheckout}
                    disabled={isCheckingOut || !canConfirmPayment}
                    className="w-full flex items-center justify-center gap-2 bg-br hover:brightness-110 text-white rounded-[14px] py-3.5 text-sm font-bold transition-all disabled:opacity-50 shadow-[0_6px_14px_rgba(30,155,80,0.25)]"
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

      {/* Shortcut Keyboard Desktop (Opsional PC) */}
      <div className="hidden lg:block fixed bottom-0 inset-x-0 lg:pl-[248px] z-30 pointer-events-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-3">
          <div className="pointer-events-auto bg-ink text-white/90 rounded-xl shadow-lg px-4 py-2 flex flex-wrap items-center gap-x-5 text-[11px] font-medium justify-center sm:justify-start">
            <span><kbd className="px-1.5 py-0.5 bg-white/15 rounded font-mono">F2</kbd> Cari Barang</span>
            <span><kbd className="px-1.5 py-0.5 bg-white/15 rounded font-mono">F3</kbd> Scan Barcode</span>
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