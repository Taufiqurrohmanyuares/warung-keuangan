'use client'

import { useEffect, useState } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { createClient } from '@/lib/supabase/client'
import { MenuListItem } from '@/components/profile/shared'
import { Store, ReceiptText, BookUser, Wallet, Mail, CalendarDays, Settings, ShieldCheck, Info, ChevronRight } from 'lucide-react'
import Link from 'next/link'

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

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
      <div className="w-full pb-16 lg:pb-10">

        {/* ===================== HEADER ===================== */}
        <div className="mb-6">
          <h1 className="text-[24px] font-extrabold tracking-tight text-ink m-0">Profil & Akun</h1>
          <p className="text-mu mt-1 text-[14px]">Informasi warung dan pengaturan sistem</p>
        </div>

        {/* ===================== KARTU PROFIL UTAMA ===================== */}
        <div className="bg-card border border-ln rounded-[22px] p-6 sm:p-7 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-20 h-20 bg-br text-white rounded-[20px] flex items-center justify-center font-extrabold text-3xl shadow-[0_6px_14px_rgba(30,155,80,0.25)] shrink-0">
              {(namaToko || namaPemilik || email || 'W').charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1">
              <h2 className="text-[20px] font-extrabold text-ink">{namaToko || 'Nama Warung Anda'}</h2>
              <p className="text-mu text-sm font-semibold">{namaPemilik || 'Pemilik Warung'}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-mu pt-1">
                <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-br" /> {email}</span>
                <span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5 text-br" /> Bergabung {formattedJoinDate}</span>
              </div>
            </div>
          </div>

          {/* Statistik Ringkas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-ln">
            <div className="bg-bg border border-ln rounded-[16px] p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-so text-br rounded-[12px] flex items-center justify-center shrink-0"><ReceiptText className="w-5 h-5" /></div>
              <div>
                <p className="text-[11px] font-bold text-mu uppercase tracking-wider mb-0.5">Total Transaksi</p>
                <p className="text-[16px] font-extrabold text-ink leading-tight">{stats.totalTx} Catatan</p>
              </div>
            </div>
            <div className="bg-bg border border-ln rounded-[16px] p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-so text-br rounded-[12px] flex items-center justify-center shrink-0"><BookUser className="w-5 h-5" /></div>
              <div>
                <p className="text-[11px] font-bold text-mu uppercase tracking-wider mb-0.5">Kasbon Aktif</p>
                <p className="text-[16px] font-extrabold text-ink leading-tight">{stats.totalDebts} Orang</p>
              </div>
            </div>
            <div className="bg-bg border border-ln rounded-[16px] p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-so text-br rounded-[12px] flex items-center justify-center shrink-0"><Wallet className="w-5 h-5" /></div>
              <div>
                <p className="text-[11px] font-bold text-mu uppercase tracking-wider mb-0.5">Pemasukan Bulan Ini</p>
                <p className="text-[16px] font-extrabold text-br leading-tight">{formatRupiah(stats.incomeThisMonth)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ===================== MENU NAVIGASI PROFIL ===================== */}
        {loading ? (
          <div className="animate-pulse bg-card border border-ln h-64 rounded-[22px] w-full" />
        ) : (
          <div className="bg-card border border-ln shadow-sm rounded-[22px] p-2 sm:p-3 divide-y divide-ln">
            <MenuListItem 
              href="/profile/warung" 
              icon={<Store className="w-5 h-5 text-br" />} 
              iconBg="bg-so border border-br/20" 
              title="Informasi Warung" 
              description="Nama warung, alamat, nomor HP, dan jam operasional" 
            />
            <MenuListItem 
              href="/profile/pengaturan" 
              icon={<Settings className="w-5 h-5 text-br" />} 
              iconBg="bg-so border border-br/20" 
              title="Pengaturan" 
              description="Kasbon, aplikasi, dan cadangan data" 
            />
            <MenuListItem 
              href="/profile/security" 
              icon={<ShieldCheck className="w-5 h-5 text-rd" />} 
              iconBg="bg-rs border border-rd/20" 
              title="Keamanan" 
              description="Ubah password dan keluar akun" 
            />
            <MenuListItem 
              href="/profile/tentang" 
              icon={<Info className="w-5 h-5 text-ink" />} 
              iconBg="bg-bg border border-ln" 
              title="Tentang & Bantuan" 
              description="Versi aplikasi, panduan, dan kontak developer" 
            />
          </div>
        )}
      </div>
    </DashboardShell>
  )
}