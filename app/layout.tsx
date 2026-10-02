import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Catatan Keuangan Warung',
  description: 'Aplikasi pencatat pemasukan & pengeluaran harian untuk usaha kecil',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={manrope.variable}>
      <body className="font-sans bg-bg text-ink antialiased">{children}</body>
    </html>
  )
}