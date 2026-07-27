'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [namaToko, setNamaToko] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

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
      // Kalau project Supabase kamu setting "confirm email", user perlu cek email dulu.
      // Kalau confirm email dimatikan, user langsung bisa login.
      alert('Registrasi berhasil! Silakan cek email untuk konfirmasi (kalau diaktifkan), lalu login.')
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border p-6">
        <h1 className="text-xl font-semibold mb-1">Catatan Keuangan Warung</h1>
        <p className="text-sm text-gray-500 mb-6">
          {mode === 'login' ? 'Masuk ke akun kamu' : 'Buat akun baru'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Nama toko"
              value={namaToko}
              onChange={(e) => setNamaToko(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            minLength={6}
            required
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Daftar'}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="text-sm text-gray-500 mt-4 underline"
        >
          {mode === 'login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
        </button>
      </div>
    </div>
  )
}
