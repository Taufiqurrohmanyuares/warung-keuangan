'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LayoutDashboard, ReceiptText, LogOut, Store, BookUser, Tags, Package, User } from 'lucide-react'

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Fungsi untuk menentukan gaya tombol/tautan aktif
  const linkClass = (path: string) =>
    `flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
      pathname === path
        ? 'bg-gray-900 text-white shadow-md'
        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
    }`

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Bagian Kiri: Logo & Navigasi */}
          <div className="flex items-center gap-6">
            
            {/* Logo / Judul Aplikasi */}
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-600 rounded-lg shadow-sm">
                <Store className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-gray-900 hidden sm:block">Buku Warung</span>
            </div>

            {/* Garis Pemisah (Hanya di layar besar) */}
            <div className="hidden sm:block h-6 w-px bg-gray-200"></div>

            {/* Menu Navigasi */}
            <div className="flex gap-2">
              <Link href="/dashboard" className={linkClass('/dashboard')}>
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <Link href="/transactions" className={linkClass('/transactions')}>
                <ReceiptText className="w-4 h-4" />
                <span className="hidden sm:inline">Transaksi</span>
              </Link>
              <Link href="/debts" className={linkClass('/debts')}>
                <BookUser className="w-4 h-4" />
                <span className="hidden sm:inline">Kasbon</span>
              </Link>
              <Link href="/categories" className={linkClass('/categories')}>
                <Tags className="w-4 h-4" />
                <span className="hidden sm:inline">Kategori</span>
              </Link>
              <Link href="/products" className={linkClass('/products')}>
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">Stok</span>
              </Link>
              <Link href="/profile" className={linkClass('/profile')}>
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Profil</span>
              </Link>
            </div>
          </div>

          {/* Bagian Kanan: Tombol Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
            title="Keluar dari akun"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
          
        </div>
      </div>
    </nav>
  )
}