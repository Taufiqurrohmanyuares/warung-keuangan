'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardShell from '@/components/DashboardShell'
import { createClient } from '@/lib/supabase/client'
import { ActionButton, SettingsLayout } from '@/components/profile/shared'
import { KeyRound, LogOut, ShieldCheck, Loader2, ArrowLeft } from 'lucide-react'

export default function SecurityPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    if (!window.confirm('Apakah Anda yakin ingin keluar dari aplikasi?')) return

    setIsLoggingOut(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      router.push('/login')
      router.refresh()
    } catch (error: any) {
      alert('Gagal keluar dari akun: ' + error.message)
      setIsLoggingOut(false)
    }
  }

  function handleChangePassword() {
    router.push('/forgot-password')
  }

  return (
    <DashboardShell>
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full">
        
        <div className="mb-6">
          <Link href="/profile" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-50 px-4 py-2 rounded-xl border border-gray-200 shadow-sm transition-all">
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Profil
          </Link>
        </div>

        <SettingsLayout
          title="Keamanan"
          subtitle="Kelola akses akun dan keamanan perangkat Anda"
          tipTitle="Keamanan Akun Anda"
          tipIcon={<ShieldCheck className="w-5 h-5 text-red-600" />}
          tip="Pastikan Anda selalu keluar dari perangkat jika menggunakan komputer umum atau perangkat bersama guna menjaga kerahasiaan data keuangan warung Anda."
        >
          <div className="space-y-4">
            <ActionButton icon={<KeyRound className="w-5 h-5 text-gray-500" />} label="Ubah Password" onClick={handleChangePassword} />
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-xl py-3.5 text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
            >
              {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />} 
              {isLoggingOut ? 'Sedang Keluar...' : 'Keluar dari Akun Ini'}
            </button>
          </div>
        </SettingsLayout>
      </div>
    </DashboardShell>
  )
}