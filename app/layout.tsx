import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Catatan Keuangan Warung',
  description: 'Aplikasi pencatat pemasukan & pengeluaran harian untuk usaha kecil',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
