'use client'

import Link from 'next/link'
import LogoIcon from '@/components/LogoIcon'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LOW_STOCK_THRESHOLD } from '@/lib/supabase/constants'
import {
  LayoutDashboard, ReceiptText, LogOut, BookUser, Tags, Package, User,
  ShoppingCart, Bell, AlertTriangle, Lock, LayoutGrid, X, type LucideIcon,
} from 'lucide-react'

type NavItem = { href: string; label: string; icon: LucideIcon }

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Utama',
    items: [
      { href: '/dashboard', label: 'Beranda', icon: LayoutDashboard },
      { href: '/kasir', label: 'Kasir', icon: ShoppingCart },
    ],
  },
  {
    title: 'Keuangan',
    items: [
      { href: '/transactions', label: 'Transaksi', icon: ReceiptText },
      { href: '/debts', label: 'Kasbon', icon: BookUser },
      { href: '/tutup-kasir', label: 'Tutup Kasir', icon: Lock },
    ],
  },
  {
    title: 'Gudang',
    items: [
      { href: '/products', label: 'Stok', icon: Package },
      { href: '/categories', label: 'Kategori', icon: Tags },
    ],
  },
  { title: 'Akun', items: [{ href: '/profile', label: 'Profil', icon: User }] },
]

const TAB_LEFT: NavItem[] = [
  { href: '/dashboard', label: 'Beranda', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transaksi', icon: ReceiptText },
]
const TAB_RIGHT: NavItem[] = [{ href: '/debts', label: 'Kasbon', icon: BookUser }]
const MORE_ITEMS: NavItem[] = [
  { href: '/tutup-kasir', label: 'Tutup Kasir', icon: Lock },
  { href: '/products', label: 'Stok', icon: Package },
  { href: '/categories', label: 'Kategori', icon: Tags },
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
  
  const [moreOpen, setMoreOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [shopName, setShopName] = useState('')

  const fetchLowStock = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    const fetchedName = (user.user_metadata?.nama_toko as string) || user.email?.split('@')[0] || ''
    if (fetchedName) {
      setShopName(fetchedName)
      localStorage.setItem('warung_shop_name', fetchedName)
    }

    const { data } = await supabase
      .from('products')
      .select('id, name, stock, unit')
      .eq('user_id', user.id)
      .lte('stock', LOW_STOCK_THRESHOLD)
      .order('stock', { ascending: true })

    setLowStockItems(data || [])
  }, [supabase])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem('warung_shop_name')
      if (savedName) setShopName(savedName)
    }
    fetchLowStock()
    setMoreOpen(false)
    setNotifOpen(false)
  }, [pathname, fetchLowStock])

  useEffect(() => {
    if (moreOpen || notifOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [moreOpen, notifOpen])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const badge = lowStockItems.length > 9 ? '9+' : String(lowStockItems.length)
  const moreActive = MORE_ITEMS.some((i) => isActive(pathname, i.href))

  const logo = (
    <div className="flex items-center gap-1.5">
      <LogoIcon className="w-12 h-auto shrink-0" />
      <div className="hidden lg:flex flex-col justify-center mt-0.5">
        <p className="font-extrabold text-ink text-[14px] leading-tight whitespace-nowrap">Warung Keuangan</p>
        <p className="text-[11px] font-semibold text-mu leading-tight truncate max-w-[120px]">{shopName || 'Memuat...'}</p>
      </div>
    </div>
  )

  const notifBell = (
    <div className="relative">
      <button
        onClick={() => setNotifOpen((v) => !v)}
        className={`relative w-10 h-10 rounded-xl transition-all flex items-center justify-center ${notifOpen ? 'bg-so' : 'hover:bg-so'}`}
        aria-label="Notifikasi stok"
      >
        <Bell className={`w-5 h-5 transition-colors ${notifOpen ? 'text-br' : 'text-ink'}`} />
        {lowStockItems.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-rd text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-card">
            {badge}
          </span>
        )}
      </button>

      {notifOpen && (
        <>
          <div className="fixed inset-0 z-[60] md:z-40" onClick={() => setNotifOpen(false)} />
          <div className="absolute right-0 top-[115%] md:right-auto md:left-[120%] md:-top-2 w-[280px] bg-card rounded-2xl shadow-[0_12px_24px_rgba(0,0,0,0.1)] border border-ln z-[70] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-4 py-3 border-b border-ln flex items-center gap-2 bg-bg/50">
              <AlertTriangle className="w-4 h-4 text-rd" />
              <span className="text-sm font-bold text-ink">Stok Menipis</span>
            </div>
            {lowStockItems.length === 0 ? (
              <p className="text-sm text-mu text-center py-8 px-4">Semua stok aman 👍</p>
            ) : (
              <div className="max-h-[300px] overflow-y-auto overscroll-contain">
                {lowStockItems.map((item) => (
                  <Link
                    key={item.id}
                    href="/products"
                    onClick={() => setNotifOpen(false)}
                    className="flex items-center justify-between px-4 py-3.5 hover:bg-so/60 transition-colors border-b border-ln/50 last:border-0"
                  >
                    <span className="text-sm text-ink font-medium truncate pr-3">{item.name}</span>
                    <span className={`text-xs font-bold shrink-0 px-2 py-0.5 rounded-md ${item.stock === 0 ? 'bg-rs text-rd' : 'bg-am text-[#9a6b00]'}`}>
                      {item.stock} {item.unit}
                    </span>
                  </Link>
                ))}
              </div>
            )}
            <Link
              href="/products"
              onClick={() => setNotifOpen(false)}
              className="block text-center py-3 text-xs font-bold text-br hover:bg-so transition-colors border-t border-ln"
            >
              Kelola Stok Barang
            </Link>
          </div>
        </>
      )}
    </div>
  )

  const tabClass = (active: boolean) =>
    `flex-1 flex flex-col items-center justify-center gap-1 py-1.5 text-[11px] font-bold transition-all duration-200 ${
      active ? 'text-br scale-105' : 'text-mu hover:text-ink'
    }`

  return (
    <>
      {/* ============ HP: BAR ATAS ============ */}
      <header className="md:hidden sticky top-0 z-40 bg-card border-b border-ln pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between h-[60px] px-4">
          <div className="flex items-center gap-2.5">
            <LogoIcon className="w-9 h-9 shrink-0" />
            <span className="font-extrabold text-[16px] text-ink">Warung Keuangan</span>
          </div>
          {notifBell}
        </div>
      </header>

      {/* ============ HP: MENU BAWAH ============ */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-card border-t border-ln px-2 pt-2 pb-[calc(8px+env(safe-area-inset-bottom))] flex items-end shadow-[0_-4px_24px_rgba(0,0,0,0.02)]"
        aria-label="Menu utama"
      >
        {TAB_LEFT.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={tabClass(isActive(pathname, href))}>
            <Icon className="w-[22px] h-[22px]" />
            {label}
          </Link>
        ))}

        <Link href="/kasir" aria-label="Kasir" className="flex-1 flex flex-col items-center group">
          <span
            className={`-mt-8 w-[56px] h-[56px] rounded-full flex items-center justify-center text-white border-4 border-bg shadow-[0_8px_18px_rgba(30,155,80,0.3)] transition-transform active:scale-95 duration-200 ${
              isActive(pathname, '/kasir') ? 'bg-dk' : 'bg-br group-hover:brightness-110'
            }`}
          >
            <ShoppingCart className="w-6 h-6" />
          </span>
          <span className={`text-[11px] font-bold mt-1 ${isActive(pathname, '/kasir') ? 'text-br' : 'text-mu'}`}>Kasir</span>
        </Link>

        {TAB_RIGHT.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={tabClass(isActive(pathname, href))}>
            <Icon className="w-[22px] h-[22px]" />
            {label}
          </Link>
        ))}

        <button onClick={() => setMoreOpen(true)} className={`${tabClass(moreActive)} relative`}>
          <LayoutGrid className="w-[22px] h-[22px]" />
          Lainnya
          {lowStockItems.length > 0 && (
            <span className="absolute top-1 right-[20%] w-2.5 h-2.5 bg-rd rounded-full border-2 border-card" />
          )}
        </button>
      </nav>

      {/* ============ HP: LEMBAR "LAINNYA" (BOTTOM SHEET) ============ */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-ink/40 animate-in fade-in duration-200" onClick={() => setMoreOpen(false)} />
          <div className="relative w-full bg-card rounded-t-[24px] p-5 pb-[max(1.5rem,calc(1.5rem+env(safe-area-inset-bottom)))] animate-in slide-in-from-bottom-full duration-300 ease-out">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[18px] font-extrabold text-ink m-0">Menu lainnya</h2>
              <button
                onClick={() => setMoreOpen(false)}
                className="w-10 h-10 rounded-full bg-bg flex items-center justify-center hover:bg-ln transition-colors"
                aria-label="Tutup"
              >
                <X className="w-5 h-5 text-ink" />
              </button>
            </div>
            
            <div className="grid grid-cols-4 gap-3">
              {MORE_ITEMS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={`relative flex flex-col items-center justify-center gap-2 py-4 rounded-[16px] border text-[11px] font-bold transition-colors ${
                    isActive(pathname, href)
                      ? 'bg-so border-br/40 text-br'
                      : 'bg-bg border-ln text-ink hover:bg-ln/50'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  {label}
                  {href === '/products' && lowStockItems.length > 0 && (
                    <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 bg-rd text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-sm">
                      {badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
            
            <button
              onClick={handleLogout}
              className="mt-5 w-full h-[48px] flex items-center justify-center gap-2 rounded-[14px] text-[13px] font-bold text-rd bg-rs border border-rd/10 hover:bg-rd hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" /> Keluar dari akun
            </button>
          </div>
        </div>
      )}

      {/* ============ TABLET (Rail) & DESKTOP (Sidebar Penuh) ============ */}
      <aside className="hidden md:flex md:flex-col fixed inset-y-0 left-0 w-20 lg:w-[248px] bg-card border-r border-ln z-40">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-2 px-3 lg:px-3 pt-5 pb-4 lg:h-[80px] lg:py-0 shrink-0">
          {logo}
          {notifBell}
        </div>

        <nav className="flex-1 px-3 pb-4 overflow-y-auto overscroll-contain" aria-label="Menu utama">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="mb-2">
              <p className="hidden lg:block px-3.5 pt-3 pb-1.5 text-[10.5px] font-extrabold tracking-[0.08em] text-mu uppercase">
                {group.title}
              </p>
              <div className="space-y-1 pt-2 lg:pt-0">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active = isActive(pathname, href)
                  return (
                    <Link
                      key={href}
                      href={href}
                      title={label}
                      aria-current={active ? 'page' : undefined}
                      className={`relative flex items-center justify-center lg:justify-start gap-3.5 h-[44px] lg:px-4 rounded-[12px] text-[14px] font-semibold transition-all duration-200 group ${
                        active
                          ? 'bg-br text-white shadow-[0_6px_14px_rgba(30,155,80,0.25)]'
                          : 'text-mu hover:bg-so hover:text-br'
                      }`}
                    >
                      <Icon className={`w-5 h-5 shrink-0 transition-transform ${active ? '' : 'group-hover:scale-110'}`} />
                      <span className="hidden lg:inline flex-1 truncate">{label}</span>
                      
                      {href === '/products' && lowStockItems.length > 0 && (
                        <span className="absolute lg:static top-1 right-1 min-w-[18px] h-[18px] px-1 bg-rd text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-sm">
                          {badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-ln p-3 lg:p-4 flex flex-col lg:flex-row items-center justify-between gap-2 shrink-0">
          <div className="hidden lg:flex items-center gap-2 flex-1 min-w-0">
            <div className="w-[32px] h-[32px] rounded-[10px] bg-dk text-white flex items-center justify-center font-extrabold shrink-0 shadow-sm text-[14px]">
              {(shopName || 'W').charAt(0).toUpperCase()}
            </div>
            <p className="text-[13px] font-bold text-ink truncate leading-tight flex-1">{shopName || 'Memuat...'}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Keluar"
            className="w-10 h-10 lg:w-auto lg:h-[32px] lg:px-2.5 flex items-center justify-center gap-1.5 rounded-[10px] text-[12px] font-bold text-rd hover:bg-rs hover:text-red-700 transition-colors shrink-0"
          >
            <LogOut className="w-5 h-5 lg:w-4 lg:h-4" />
            <span className="hidden lg:inline">Keluar</span>
          </button>
        </div>
      </aside>
    </>
  )
}