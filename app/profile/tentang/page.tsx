'use client'

import Link from 'next/link'
import DashboardShell from '@/components/DashboardShell'
import { ActionButton, SettingsLayout } from '@/components/profile/shared'
import { HelpCircle, MessageCircle, Mail, Send, Heart, ArrowLeft } from 'lucide-react'

export default function TentangPage() {
  
  // FITUR NYATA: Buka Email
  function handleEmail(subject: string) {
    window.location.href = `mailto:taufiqyuarez@gmail.com?subject=${encodeURIComponent(subject)}`
  }

  // FITUR NYATA: Buka Panduan / FAQ (Bisa diganti dengan link Google Docs/Notion nanti)
  function handleOpenDocs() {
    alert('Saat ini panduan sedang dalam proses penulisan. Silakan hubungi developer untuk bantuan langsung.')
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
          title="Tentang & Bantuan"
          subtitle="Informasi aplikasi dan pusat bantuan"
          tipTitle="Terima Kasih!"
          tipIcon={<Heart className="w-5 h-5 text-red-500" />}
          tip="Aplikasi ini dirancang khusus untuk membantu pemilik warung dan UMKM mendigitalisasi pencatatan keuangan menjadi lebih rapi dan efisien."
        >
          <div className="pb-8 border-b border-gray-100 mb-8">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Bantuan</h2>
            <div className="space-y-3">
              <ActionButton icon={<HelpCircle className="w-4 h-4 text-gray-500" />} label="Panduan Penggunaan" onClick={handleOpenDocs} />
              <ActionButton icon={<MessageCircle className="w-4 h-4 text-gray-500" />} label="FAQ (Tanya Jawab)" onClick={handleOpenDocs} />
              <ActionButton icon={<Mail className="w-4 h-4 text-gray-500" />} label="Hubungi Developer" onClick={() => handleEmail('Pertanyaan seputar Buku Warung')} />
              <ActionButton icon={<Send className="w-4 h-4 text-gray-500" />} label="Kirim Masukan & Saran" onClick={() => handleEmail('Saran Fitur Buku Warung')} />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Tentang Aplikasi</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                <span className="text-gray-500 font-medium">Nama Aplikasi</span>
                <span className="font-bold text-gray-900">Buku Warung</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                <span className="text-gray-500 font-medium">Versi Rilis</span>
                <span className="font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">v1.0.0</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                <span className="text-gray-500 font-medium">Developer</span>
                <span className="font-bold text-gray-900">Taufiqurrohman Yuares</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                <span className="text-gray-500 font-medium">Update Terakhir</span>
                <span className="font-bold text-gray-900">Juli 2026</span>
              </div>
            </div>
          </div>
        </SettingsLayout>
      </div>
    </DashboardShell>
  )
}