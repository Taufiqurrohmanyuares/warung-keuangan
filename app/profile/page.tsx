'use client'

import { useEffect, useState } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { createClient } from '@/lib/supabase/client'
import { MenuListItem } from '@/components/profile/shared'
import { Store, ReceiptText, BookUser, Wallet, Mail, CalendarDays, Settings, ShieldCheck, Info } from 'lucide-react'

export default function ProfileHubPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [joinedAt, setJoinedAt] = useState('')
  const [namaToko, setNamaToko] = useState('')
  const [namaPemilik, setNamaPemilik] = useState('')
  const [stats, setStats] = useState({ totalTx: 0, totalDebts: 0, incomeThisMonth: 0 })

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        setEmail(user.email || '')
        setJoinedAt(user.created_at || '')

        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (profile) {
          setNamaToko(profile.nama_toko || '')
          setNamaPemilik(profile.full_name || '')
        }

        const firstDayOfMonth = new Date()
        firstDayOfMonth.setDate(1)
        const firstDayStr = firstDayOfMonth.toISOString().split('T')[0]

        const [{ count: txCount }, { count: debtCount }, { data: incomeRows }] = await Promise.all([
          supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('debts').select('*', { count: 'exact', head: true }).eq('user_id', user.id).neq('status', 'paid'),
          supabase.from('transactions').select('amount').eq('user_id', user.id).eq('type', 'income').gte('occurred_at', firstDayStr),
        ])

        setStats({
          totalTx: txCount || 0,
          totalDebts: debtCount || 0,
          incomeThisMonth: (incomeRows || []).reduce((s, r: any) => s + Number(r.amount || 0), 0),
        })
      } catch (error) {
        console.error("Gagal memuat profil:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const formattedJoinDate = joinedAt
    ? new Date(joinedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '-'

  return (
    <DashboardShell>
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full">
        <div className="bg-gray-900 rounded-2xl p-6 sm:p-8 text-white shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-20 h-20 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-3xl shadow-sm border border-gray-800 shrink-0">
              {(namaToko || namaPemilik || email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">{namaToko || 'Nama Warung Anda'}</h1>
              <p className="text-gray-400 text-sm">{namaPemilik || 'Pemilik Warung'}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mt-2">
                <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {email}</span>
                <span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Bergabung {formattedJoinDate}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-gray-800">
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700/50 flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg"><ReceiptText className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-gray-400 font-medium mb-0.5">Total Transaksi</p>
                <p className="text-lg font-bold text-white leading-none">{stats.totalTx} Catatan</p>
              </div>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700/50 flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 text-orange-400 rounded-lg"><BookUser className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-gray-400 font-medium mb-0.5">Kasbon Aktif</p>
                <p className="text-lg font-bold text-white leading-none">{stats.totalDebts} Orang</p>
              </div>
            </div>
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700/50 flex items-center gap-4">
              <div className="p-3 bg-green-500/10 text-green-400 rounded-lg"><Wallet className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-gray-400 font-medium mb-0.5">Pemasukan Bulan Ini</p>
                <p className="text-lg font-bold text-white leading-none">Rp {stats.incomeThisMonth.toLocaleString('id-ID')}</p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse bg-white h-96 rounded-xl w-full border border-gray-200"></div>
        ) : (
          <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-2 sm:p-3 divide-y divide-gray-100">
            <MenuListItem href="/profile/warung" icon={<Store className="w-5 h-5 text-blue-600" />} iconBg="bg-blue-50" title="Informasi Warung" description="Nama warung, alamat, nomor HP, dan jam operasional" />
            <MenuListItem href="/profile/pengaturan" icon={<Settings className="w-5 h-5 text-purple-600" />} iconBg="bg-purple-50" title="Pengaturan" description="Kasbon, aplikasi, dan cadangan data" />
            <MenuListItem href="/profile/security" icon={<ShieldCheck className="w-5 h-5 text-red-600" />} iconBg="bg-red-50" title="Keamanan" description="Ubah password dan keluar akun" />
            <MenuListItem href="/profile/tentang" icon={<Info className="w-5 h-5 text-gray-600" />} iconBg="bg-gray-100" title="Tentang & Bantuan" description="Versi aplikasi, panduan, dan kontak developer" />
          </div>
        )}
      </div>
    </DashboardShell>
  )
}