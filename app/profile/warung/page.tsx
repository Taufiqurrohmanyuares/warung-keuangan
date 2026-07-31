'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import DashboardShell from '@/components/DashboardShell'
import { createClient } from '@/lib/supabase/client'
import { Field, TextAreaField, SettingsLayout } from '@/components/profile/shared'
import { Store, User, Phone, Clock, MapPin, StickyNote, Save, Info, ArrowLeft } from 'lucide-react'

export default function WarungSettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  const [namaToko, setNamaToko] = useState('')
  const [namaPemilik, setNamaPemilik] = useState('')
  const [noHp, setNoHp] = useState('')
  const [alamat, setAlamat] = useState('')
  const [jamOperasional, setJamOperasional] = useState('')
  const [catatan, setCatatan] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (profile) {
        setNamaToko(profile.nama_toko || '')
        setNamaPemilik(profile.full_name || '')
        setNoHp(profile.no_hp || '')
        setAlamat(profile.alamat || '')
        setJamOperasional(profile.jam_operasional || '')
        setCatatan(profile.catatan || '')
      }
      setLoading(false)
    }
    load()
  }, [])

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!namaToko.trim()) return alert('Nama warung wajib diisi!')

    startTransition(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: namaPemilik,
        nama_toko: namaToko,
        no_hp: noHp,
        alamat,
        jam_operasional: jamOperasional,
        catatan,
        updated_at: new Date().toISOString(),
      })
      if (error) alert('Gagal menyimpan: ' + error.message)
      else alert('Informasi warung berhasil disimpan!')
    })
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

        {loading ? (
          <div className="animate-pulse bg-white h-96 rounded-xl w-full border border-gray-200"></div>
        ) : (
          <form onSubmit={handleSave}>
            <SettingsLayout
              title="Informasi Warung"
              subtitle="Data ini akan tampil di struk dan laporan keuangan Anda"
              tipTitle="Kenapa Mengisi Data Ini?"
              tipIcon={<Info className="w-5 h-5 text-blue-600" />}
              tip="Data profil warung digunakan untuk memberikan identitas resmi pada setiap laporan atau cetakan yang Anda unduh. Pastikan nama warung tidak kosong."
              footer={
                <button type="submit" disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl py-3 text-sm font-bold transition-colors shadow-sm disabled:opacity-50">
                  <Save className="w-4 h-4" /> {isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <Field label="Nama Warung (Wajib)" icon={<Store className="h-4 w-4 text-gray-400" />}
                  value={namaToko} onChange={(e) => setNamaToko(e.target.value)} placeholder="Contoh: Warung Berkah" />
                <Field label="Nama Pemilik" icon={<User className="h-4 w-4 text-gray-400" />}
                  value={namaPemilik} onChange={(e) => setNamaPemilik(e.target.value)} placeholder="Nama lengkap Anda" />
                <Field label="Nomor HP" icon={<Phone className="h-4 w-4 text-gray-400" />}
                  value={noHp} onChange={(e) => setNoHp(e.target.value)} placeholder="0812xxxxxxxx" />
                <Field label="Jam Operasional" icon={<Clock className="h-4 w-4 text-gray-400" />}
                  value={jamOperasional} onChange={(e) => setJamOperasional(e.target.value)} placeholder="07.00 - 21.00" />
              </div>
              
              <Field label="Alamat Warung" icon={<MapPin className="h-4 w-4 text-gray-400" />}
                value={alamat} onChange={(e) => setAlamat(e.target.value)} placeholder="Jl. Contoh No. 1, Kecamatan..." />
              <TextAreaField label="Catatan Warung (Opsional)" icon={<StickyNote className="h-4 w-4 text-gray-400" />}
                value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Contoh: Hari libur nasional tutup, menerima pesanan grosir, dll" />
            </SettingsLayout>
          </form>
        )}
      </div>
    </DashboardShell>
  )
}