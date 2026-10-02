'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import LogoIcon from '@/components/LogoIcon'
import { Mail, Lock, Store, CheckCircle, Shield, Smartphone, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [namaToko, setNamaToko] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setInfo('')

    if (mode === 'register') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nama_toko: namaToko } },
      })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      setInfo('Registrasi berhasil! Silakan cek email untuk konfirmasi, lalu masuk.')
      setMode('login')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  return (
    <div className="h-screen w-screen overflow-hidden grid grid-cols-1 lg:grid-cols-2 bg-card font-sans">
      
      {/* ===================== SISI KIRI (PANEL HIJAU) ===================== */}
      <div className="hidden lg:flex flex-col justify-between bg-br p-10 text-white relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full border-2 border-white/10 pointer-events-none" />
        
        <div />

        <div className="space-y-4 max-w-lg z-10">
          <h1 className="text-[34px] font-extrabold leading-[1.2] tracking-tight">
            {mode === 'login' ? 'Untung rugi warung, beres dalam genggaman.' : 'Mulai catat, warung makin sehat.'}
          </h1>
          <p className="text-white/80 text-[14px] leading-relaxed">
            {mode === 'login'
              ? 'Catat penjualan, stok, dan kasbon pelanggan dengan cepat, tanpa buku tulis, tanpa pusing.'
              : 'Daftarkan warungmu dan lihat laba bersih setiap hari langsung dari HP.'}
          </p>

          <div className="space-y-2.5 pt-2">
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-[14px] border border-white/10">
              <CheckCircle className="w-4 h-4 text-gd shrink-0" />
              <span className="text-xs font-semibold">Laba bersih harian & bulanan otomatis</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-[14px] border border-white/10">
              <Smartphone className="w-4 h-4 text-gd shrink-0" />
              <span className="text-xs font-semibold">Kasir cepat, nyaman dipakai di HP</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-[14px] border border-white/10">
              <Shield className="w-4 h-4 text-gd shrink-0" />
              <span className="text-xs font-semibold">Data warungmu aman & terpisah</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-white/60 font-medium z-10">
          © 2026 WarungKeuangan. Solusi digital UMKM Indonesia.
        </div>
      </div>

      {/* ===================== SISI KANAN (FORM OTENTIKASI) ===================== */}
      <div className="h-full flex items-center justify-center p-6 sm:p-10 bg-card overflow-y-auto">
        <div className="w-full max-w-md space-y-4 my-auto">
          
          <div className="text-center space-y-1.5">
            <div className="inline-flex justify-center">
              {/* Logo diperbesar menjadi w-20 h-20 */}
              <LogoIcon className="w-20 h-20" />
            </div>
            <h2 className="text-[20px] font-extrabold text-ink tracking-tight">
              {mode === 'login' ? 'Halo! Selamat datang kembali' : 'Buat akun warungmu'}
            </h2>
            <p className="text-mu text-[12px]">
              {mode === 'login' ? 'Masuk untuk melanjutkan catatan warungmu.' : 'Gratis, cukup beberapa detik.'}
            </p>
          </div>

          <div className="flex bg-card border border-ln rounded-[16px] p-1 text-xs font-bold shadow-sm">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); setInfo('') }}
              className={`flex-1 py-2.5 rounded-[12px] transition-all text-center ${
                mode === 'login' 
                  ? 'bg-card text-br shadow-[0_2px_6px_rgba(0,0,0,0.06)] border border-br/30 font-extrabold' 
                  : 'text-mu hover:text-ink'
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(''); setInfo('') }}
              className={`flex-1 py-2.5 rounded-[12px] transition-all text-center ${
                mode === 'register' 
                  ? 'bg-card text-br shadow-[0_2px_6px_rgba(0,0,0,0.06)] border border-br/30 font-extrabold' 
                  : 'text-mu hover:text-ink'
              }`}
            >
              Daftar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <div>
                <label className="block text-[11px] font-extrabold text-ink mb-1">Nama Warung / Toko</label>
                <div className="relative">
                  <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mu w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Contoh: Warung Bu Sari"
                    value={namaToko}
                    onChange={(e) => setNamaToko(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-card border border-ln rounded-[12px] text-xs text-ink outline-none focus:border-br transition-colors font-medium"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-extrabold text-ink mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mu w-4 h-4" />
                <input
                  type="email"
                  placeholder="Masukkan alamat email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-card border border-ln rounded-[12px] text-xs text-ink outline-none focus:border-br transition-colors font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-extrabold text-ink">Password</label>
                {mode === 'login' && (
                  <Link href="/forgot-password" className="text-[11px] font-bold text-br hover:underline">
                    Lupa password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mu w-4 h-4" />
                <input
                  type="password"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-card border border-ln rounded-[12px] text-xs text-ink outline-none focus:border-br transition-colors font-medium"
                  minLength={6}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-2.5 bg-rs border border-rd/30 rounded-[10px] text-[11px] font-bold text-rd">
                {error}
              </div>
            )}
            {info && (
              <div className="p-2.5 bg-so border border-br/30 rounded-[10px] text-[11px] font-bold text-br">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-br hover:brightness-110 text-white rounded-[12px] py-3 text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_4px_10px_rgba(30,155,80,0.25)]"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {loading ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Daftar Sekarang'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-1.5">
            <div className="h-px bg-ln flex-1" />
            <span className="text-[10px] font-extrabold text-mu uppercase tracking-wider">Atau</span>
            <div className="h-px bg-ln flex-1" />
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-2 bg-card border border-ln rounded-[12px] py-3 text-xs font-bold text-ink hover:bg-so transition-all disabled:opacity-50 shadow-sm"
          >
            <svg width="16" height="16" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.4-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.6 6.1 29.6 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.1-5.1l-6.5-5.5C29.5 35.3 26.9 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.6 5.1C9.4 39.6 16.1 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.4l6.5 5.5C41.5 36 44 30.5 44 24c0-1.4-.1-2.4-.4-3.5z"/>
            </svg>
            {googleLoading ? 'Menghubungkan...' : mode === 'login' ? 'Masuk dengan Google' : 'Daftar dengan Google'}
          </button>

          <div className="text-center pt-1">
            <p className="text-[11px] text-mu font-semibold">
              {mode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}{' '}
              <button
                type="button"
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setInfo('') }}
                className="text-br font-extrabold hover:underline ml-1"
              >
                {mode === 'login' ? 'Buat Akun' : 'Masuk'}
              </button>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}