'use client'

import { useEffect, useState, useTransition } from 'react'
import Navbar from '@/components/Navbar'
import { User, ShieldCheck, LogOut, Save, Briefcase, Store, ReceiptText, BookUser, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const [email, setEmail] = useState<string>('')
  const [fullName, setFullName] = useState<string>('')
  const [role, setRole] = useState<string>('Pemilik Warung')
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  
  // Statistik Ringkas Akun
  const [stats, setStats] = useState({ totalTx: 0, totalDebts: 0 })

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function getProfileData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setEmail(user.email || '')

        // Ambil data profil
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profile) {
          setFullName(profile.full_name || '')
          setRole(profile.role || 'Pemilik Warung')
        }

        // Ambil statistik ringkas transaksi & kasbon user
        const [{ count: txCount }, { count: debtCount }] = await Promise.all([
          supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('debts').select('*', { count: 'exact', head: true }).eq('user_id', user.id).neq('status', 'paid')
        ])

        setStats({
          totalTx: txCount || 0,
          totalDebts: debtCount || 0,
        })
      }
      setLoading(false)
    }
    getProfileData()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: fullName,
          role: role,
          updated_at: new Date().toISOString(),
        })

      if (error) {
        alert('Gagal memperbarui profil: ' + error.message)
      } else {
        alert('Profil berhasil diperbarui!')
      }
    })
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6">
        
        {/* Header Banner Profil */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg mb-6 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 translate-x-6 translate-y-6 opacity-10 pointer-events-none">
            <Store className="w-56 h-56" />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 relative z-10">
            <div className="w-20 h-20 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-3xl shadow-xl border-2 border-white/20">
              {fullName ? fullName.charAt(0).toUpperCase() : (email ? email.charAt(0).toUpperCase() : 'U')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight">{fullName || 'Pengguna Warung'}</h1>
                <span className="bg-blue-500/30 text-blue-300 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-blue-400/30">
                  {role}
                </span>
              </div>
              <p className="text-gray-300 text-sm mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                {email}
              </p>
            </div>
          </div>

          {/* Statistik Cepat di dalam Banner */}
          <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t border-gray-700/60 relative z-10">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10 flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl">
                <ReceiptText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Total Transaksi</p>
                <p className="text-lg font-bold text-white">{stats.totalTx} Catatan</p>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10 flex items-center gap-3">
              <div className="p-2.5 bg-orange-500/20 text-orange-400 rounded-xl">
                <BookUser className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Kasbon Aktif</p>
                <p className="text-lg font-bold text-white">{stats.totalDebts} Orang</p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse bg-white h-72 rounded-3xl w-full shadow-sm"></div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            
            {/* Form Edit Pengaturan Profil */}
            <form onSubmit={handleSave} className="bg-white border border-gray-100 shadow-sm rounded-3xl p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Pengaturan Identitas</h3>
                  <p className="text-xs text-gray-500">Ubah nama dan peran warung Anda agar tampil lebih personal</p>
                </div>
                <div className="p-2 bg-gray-50 text-gray-600 rounded-xl">
                  <User className="w-5 h-5" />
                </div>
              </div>

              {/* Input Nama Lengkap */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Nama Lengkap / Pemilik</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Masukkan nama lengkap"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Input Peran */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Peran / Status Usaha</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Briefcase className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Contoh: Pemilik Warung Sembako"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Status Email (Readonly) */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Email Terdaftar (Login)</label>
                <div className="flex items-center justify-between px-4 py-3 bg-gray-100/70 border border-gray-200 rounded-xl text-sm text-gray-600 font-medium">
                  <span>{email}</span>
                  <span className="flex items-center gap-1 text-xs text-green-700 font-semibold bg-green-50 px-2 py-0.5 rounded-md border border-green-200">
                    <ShieldCheck className="w-3.5 h-3.5" /> Aman
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3.5 text-sm font-bold transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 mt-2"
              >
                <Save className="w-4 h-4" /> {isPending ? 'Menyimpan Perubahan...' : 'Simpan Perubahan Profil'}
              </button>
            </form>

            {/* Kartu Informasi Sistem & Logout */}
            <div className="bg-white border border-gray-100 shadow-sm rounded-3xl p-6 sm:p-8 space-y-4">
              <h3 className="text-base font-bold text-gray-900">Keamanan & Sesi Akun</h3>
              <p className="text-xs text-gray-500">Anda dapat keluar dari perangkat ini kapan saja dengan aman.</p>
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-xl py-3.5 text-sm font-bold transition-colors shadow-sm"
              >
                <LogOut className="w-4 h-4" /> Keluar dari Akun Ini
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}