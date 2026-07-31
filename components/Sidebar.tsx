'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LOW_STOCK_THRESHOLD } from '@/lib/supabase/constants'
import {
  LayoutDashboard, ReceiptText, LogOut, Store, BookUser,
  Tags, Package, User, Menu, X, ShoppingCart, Bell, AlertTriangle,
} from 'lucide-react'

const MENU_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/kasir', label: 'Kasir', icon: ShoppingCart },
  { href: '/transactions', label: 'Transaksi', icon: ReceiptText },
  { href: '/debts', label: 'Kasbon', icon: BookUser },
  { href: '/categories', label: 'Kategori', icon: Tags },
  { href: '/products', label: 'Stok', icon: Package },
  { href: '/profile', label: 'Profil', icon: User },
]

type LowStockItem = { id: string; name: string; stock: number; unit: string }

function isActive(pathname: string, href: string) {
  return href === '/profile' ? pathname.startsWith('/profile') : pathname === href
}

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])

  const fetchLowStock = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('products')
      .select('id, name, stock, unit')
      .eq('user_id', user.id)
      .lte('stock', LOW_STOCK_THRESHOLD)
      .order('stock', { ascending: true })

    setLowStockItems(data || [])
  }, [])

  useEffect(() => {
    fetchLowStock()
    // refresh tiap kali pindah halaman, supaya badge selalu update (misal habis restock di halaman Stok)
  }, [pathname, fetchLowStock])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const linkClass = (href: string) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
      isActive(pathname, href)
        ? 'bg-primary text-white shadow-sm shadow-primary/30'
        : 'text-muted hover:bg-primary-light hover:text-primary'
    }`

  const Logo = () => (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shrink-0">
        <Store className="w-4.5 h-4.5 text-white" />
      </div>
      <span className="font-bold text-ink">Buku Warung</span>
    </div>
  )

  const NotifBell = () => (
    <div className="relative">
      <button
        onClick={() => setNotifOpen((v) => !v)}
        className="relative p-2 rounded-xl hover:bg-lavender transition-colors"
        aria-label="Notifikasi stok"
      >
        <Bell className="w-5 h-5 text-ink" />
        {lowStockItems.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {lowStockItems.length > 9 ? '9+' : lowStockItems.length}
          </span>
        )}
      </button>

      {notifOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-lavender flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-bold text-ink">Stok Menipis</span>
            </div>
            {lowStockItems.length === 0 ? (
              <p className="text-sm text-muted text-center py-6 px-4">Semua stok aman 👍</p>
            ) : (
              <div className="max-h-72 overflow-y-auto">
                {lowStockItems.map((item) => (
                  <Link
                    key={item.id}
                    href="/products"
                    onClick={() => setNotifOpen(false)}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-lavender/50 transition-colors"
                  >
                    <span className="text-sm text-ink font-medium truncate pr-2">{item.name}</span>
                    <span className={`text-xs font-bold shrink-0 ${item.stock === 0 ? 'text-red-600' : 'text-orange-600'}`}>
                      {item.stock} {item.unit}
                    </span>
                  </Link>
                ))}
              </div>
            )}
            <Link
              href="/products"
              onClick={() => setNotifOpen(false)}
              className="block text-center py-2.5 text-xs font-bold text-primary hover:bg-primary-light transition-colors border-t border-lavender"
            >
              Kelola Stok
            </Link>
          </div>
        </>
      )}
    </div>
  )

  return (
    <>
      {/* ============ MOBILE TOP BAR ============ */}
      <div className="lg:hidden sticky top-0 z-50 bg-white border-b border-borderc">
        <div className="flex items-center justify-between h-16 px-4">
          <Logo />
          <div className="flex items-center gap-1">
            <NotifBell />
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-xl hover:bg-lavender transition-colors"
              aria-label="Buka menu"
            >
              <Menu className="w-5 h-5 text-ink" />
            </button>
          </div>
        </div>
      </div>

      {/* ============ MOBILE DRAWER ============ */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72 bg-white shadow-xl p-4 flex flex-col rounded-l-2xl">
            <div className="flex items-center justify-between mb-6">
              <Logo />
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-xl hover:bg-lavender transition-colors"
                aria-label="Tutup menu"
              >
                <X className="w-5 h-5 text-ink" />
              </button>
            </div>

            <div className="flex-1 space-y-1.5">
              {MENU_ITEMS.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className={linkClass(href)} onClick={() => setMobileOpen(false)}>
                  <Icon className="w-4 h-4" />
                  <span className="flex-1">{label}</span>
                  {href === '/products' && lowStockItems.length > 0 && (
                    <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {lowStockItems.length > 9 ? '9+' : lowStockItems.length}
                    </span>
                  )}
                </Link>
              ))}
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Keluar
            </button>
          </div>
        </div>
      )}

      {/* ============ DESKTOP SIDEBAR ============ */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:bg-white lg:border-r lg:border-borderc lg:z-40">
        <div className="flex items-center justify-between px-6 h-20">
          <Logo />
          <NotifBell />
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto">
          {MENU_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={linkClass(href)}>
              <Icon className="w-4 h-4" />
              <span className="flex-1">{label}</span>
              {href === '/products' && lowStockItems.length > 0 && (
                <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shrink-0">
                  {lowStockItems.length > 9 ? '9+' : lowStockItems.length}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="px-4 py-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </aside>
    </>
  )
}