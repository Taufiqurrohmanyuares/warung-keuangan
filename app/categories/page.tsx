'use client'

import { useEffect, useState, useTransition } from 'react'
import Navbar from '@/components/Navbar'
import { Tag, Plus, Trash2, PlusCircle, MinusCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client' // atau client supabase Anda

type Category = {
  id: string
  name: string
  type: 'income' | 'expense'
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  async function fetchCategories() {
    try {
      const res = await fetch('/api/categories').then((r) => r.json())
      setCategories(res || [])
    } catch (err) {
      console.error("Gagal memuat kategori", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    startTransition(async () => {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type }),
      })

      if (res.ok) {
        setName('')
        await fetchCategories()
      } else {
        alert('Gagal menambah kategori')
      }
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus kategori ini?')) return

    const res = await fetch(`/api/categories?id=${id}`, {
      method: 'DELETE',
    })

    if (res.ok) {
      setCategories((prev) => prev.filter((c) => c.id !== id))
    } else {
      alert('Gagal menghapus kategori')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Navbar />
      <div className="max-w-xl mx-auto px-4 py-8 sm:px-6">
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Kelola Kategori</h1>
          <p className="text-sm text-gray-500">Tambah kategori pemasukan atau pengeluaran sesuai kebutuhan warung Anda</p>
        </div>

        {/* Form Tambah Kategori */}
        <form onSubmit={handleAdd} className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 mb-8 space-y-4">
          <div className="flex p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${type === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}
            >
              Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${type === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}
            >
              Pemasukan
            </button>
          </div>

          <div>
            <input
              type="text"
              placeholder="Nama Kategori (contoh: Belanja Gas, Kulakan Telur)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-xl py-3 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isPending ? 'Menambahkan...' : 'Tambah Kategori Baru'}
          </button>
        </form>

        {/* Daftar Kategori */}
        <h2 className="text-lg font-bold text-gray-900 mb-4">Daftar Kategori Anda</h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse bg-gray-200 h-14 rounded-xl w-full"></div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl py-12 text-center text-sm text-gray-500">
            Belum ada kategori kustom. Silakan tambah di atas.
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map((c) => (
              <div key={c.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${c.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {c.type === 'income' ? <PlusCircle className="w-4 h-4" /> : <MinusCircle className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{c.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}