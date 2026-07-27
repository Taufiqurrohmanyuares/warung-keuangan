'use client'

import { useEffect, useState, useTransition } from 'react'
import Navbar from '@/components/Navbar'
import { Package, Plus, Trash2, PlusCircle, MinusCircle } from 'lucide-react'

type Product = {
  id: string
  name: string
  stock: number
  unit: string
  price: number
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  // Form State
  const [name, setName] = useState('')
  const [stock, setStock] = useState('')
  const [unit, setUnit] = useState('pcs')
  const [price, setPrice] = useState('')

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

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    startTransition(async () => {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, stock: stock || 0, unit, price: price || 0 }),
      })

      if (res.ok) {
        setName('')
        setStock('')
        setPrice('')
        setUnit('pcs')
        await fetchProducts()
      } else {
        alert('Gagal menambah produk')
      }
    })
  }

  async function handleUpdateStock(id: string, currentStock: number, amount: number) {
    const newStock = currentStock + amount
    if (newStock < 0) return alert('Stok tidak boleh kurang dari 0')

    const res = await fetch(`/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock: newStock }),
    })

    if (res.ok) {
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, stock: newStock } : p))
      )
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus barang ini dari daftar stok?')) return

    const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setProducts((prev) => prev.filter((p) => p.id !== id))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6">
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Stok Barang Warung</h1>
          <p className="text-sm text-gray-500">Pantau ketersediaan barang cepat habis (beras, minyak, telur, dll)</p>
        </div>

        {/* Form Tambah Barang */}
        <form onSubmit={handleAdd} className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 mb-8 space-y-4">
          <h3 className="text-sm font-bold text-gray-900">Tambah Barang Baru</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Nama Barang (contoh: Beras 5kg)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500"
            />
            <input
              type="number"
              placeholder="Stok Awal"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500"
            />
            <input
              type="text"
              placeholder="Satuan (kg, liter, pcs, dus)"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500"
            />
            <input
              type="number"
              placeholder="Estimasi Harga Jual (Opsional)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-xl py-3 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isPending ? 'Menyimpan...' : 'Simpan Barang'}
          </button>
        </form>

        {/* Daftar Stok Barang */}
        <h2 className="text-lg font-bold text-gray-900 mb-4">Daftar Barang & Stok</h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-gray-200 h-16 rounded-xl w-full"></div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl py-12 text-center text-sm text-gray-500">
            Belum ada barang tercatat. Silakan tambah barang di atas.
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((p) => (
              <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900">{p.name}</p>
                    {p.stock <= 3 && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                        Stok Menipis!
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Harga: {formatRupiah(Number(p.price))}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-lg font-extrabold text-blue-600">{p.stock}</span>
                    <span className="text-xs text-gray-500 ml-1">{p.unit}</span>
                  </div>

                  {/* Tombol Plus Minus Stok Cepat */}
                  <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
                    <button
                      onClick={() => handleUpdateStock(p.id, p.stock, -1)}
                      className="p-1 text-gray-600 hover:bg-gray-200 rounded transition-colors"
                      title="Kurangi 1"
                    >
                      <MinusCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleUpdateStock(p.id, p.stock, 1)}
                      className="p-1 text-gray-600 hover:bg-gray-200 rounded transition-colors"
                      title="Tambah 1"
                    >
                      <PlusCircle className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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