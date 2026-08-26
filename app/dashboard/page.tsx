'use client'

import { useEffect, useState } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { 
  Wallet, TrendingUp, TrendingDown, AlertCircle, 
  ArrowUpRight, ArrowDownLeft, Calendar, Download, Loader2
} from 'lucide-react'
import { monthRangeStr } from '@/lib/date'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

type DashboardData = {
  totalIncome: number
  totalExpense: number
  netProfit: number
  totalDebtRemaining: number
  recentTransactions: Array<{
    id: string
    type: 'income' | 'expense'
    amount: number
    occurred_at: string
    note: string | null
  }>
  month: string
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

function getCurrentMonthValue() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getMonthLabel(monthValue: string) {
  const [year, month] = monthValue.split('-').map(Number)
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue())
  const [isExporting, setIsExporting] = useState(false)

  async function fetchDashboard(month: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard?month=${month}`).then((r) => r.json())
      setData(res)
    } catch (err) {
      console.error("Gagal memuat dashboard", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard(selectedMonth)
  }, [selectedMonth])

  // PERBAIKAN DI FUNGSI INI
  async function handleDownloadReport() {
    setIsExporting(true)
    try {
      // 1. Ubah format "YYYY-MM" menjadi rentang tanggal (from & to)
      const [year, month] = selectedMonth.split('-').map(Number)
      const { from: fromDate, to: toDate } = monthRangeStr(year, month)     // Hari terakhir bulan

      // 2. Arahkan ke endpoint Excel yang benar beserta parameternya
      const res = await fetch(`/api/transactions/export-excel?from=${fromDate}&to=${toDate}`)
      if (!res.ok) throw new Error('Gagal membuat laporan Excel')

      // 3. Proses file unduhan
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Laporan-Keuangan-${selectedMonth}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Error Export:", err)
      alert('Gagal mengunduh laporan, coba lagi')
    } finally {
      setIsExporting(false)
    }
  }

  const chartData = [
    { name: 'Pemasukan', jumlah: data?.totalIncome || 0 },
    { name: 'Pengeluaran', jumlah: data?.totalExpense || 0 },
  ]

  return (
    <DashboardShell>
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full">

        {/* HEADER */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink tracking-tight">Dashboard Keuangan</h1>
            <p className="text-sm text-muted mt-1 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted" />
              Menampilkan data {getMonthLabel(selectedMonth)}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4 pointer-events-none" />
              <input
                type="month"
                value={selectedMonth}
                max={getCurrentMonthValue()}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white text-ink rounded-xl text-sm font-medium shadow-sm outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
              />
            </div>
            <button
              onClick={handleDownloadReport}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors shadow-sm shadow-primary/30 disabled:opacity-60"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isExporting ? 'Membuat...' : 'Unduh Laporan'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse bg-white/60 h-28 rounded-2xl w-full"></div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              
              <div className="bg-white shadow-sm rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-muted">Laba Bersih</h3>
                  <div className="p-2 bg-primary-light rounded-lg"><Wallet className="w-4 h-4 text-primary" /></div>
                </div>
                <p className="text-2xl font-bold text-ink">{formatRupiah(data?.netProfit || 0)}</p>
              </div>

              <div className="bg-white shadow-sm rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-muted">Total Pemasukan</h3>
                  <div className="p-2 bg-green-50 rounded-lg"><TrendingUp className="w-4 h-4 text-green-600" /></div>
                </div>
                <p className="text-2xl font-bold text-green-600">{formatRupiah(data?.totalIncome || 0)}</p>
              </div>

              <div className="bg-white shadow-sm rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-muted">Total Pengeluaran</h3>
                  <div className="p-2 bg-red-50 rounded-lg"><TrendingDown className="w-4 h-4 text-red-600" /></div>
                </div>
                <p className="text-2xl font-bold text-red-600">{formatRupiah(data?.totalExpense || 0)}</p>
              </div>

              <div className="bg-white shadow-sm rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-muted">Piutang Kasbon</h3>
                  <div className="p-2 bg-orange-50 rounded-lg"><AlertCircle className="w-4 h-4 text-orange-600" /></div>
                </div>
                <p className="text-2xl font-bold text-orange-600">{formatRupiah(data?.totalDebtRemaining || 0)}</p>
                <p className="text-[11px] text-muted mt-1">Total saat ini, bukan per bulan</p>
              </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="lg:col-span-2 bg-white shadow-sm rounded-2xl p-6">
                <h3 className="text-base font-bold text-ink mb-6">Grafik Perbandingan — {getMonthLabel(selectedMonth)}</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E1F5" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#8B87A3', fontSize: 12 }} dy={10} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#8B87A3', fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value: any) => formatRupiah(Number(value))}
                        cursor={{ fill: '#EEECFB' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(91,79,229,0.15)' }}
                      />
                      <Bar dataKey="jumlah" fill="#5B4FE5" radius={[8, 8, 0, 0]} maxBarSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="lg:col-span-1 bg-white shadow-sm rounded-2xl p-6 flex flex-col h-full">
                <h3 className="text-base font-bold text-ink mb-5">Aktivitas Terbaru</h3>
                
                <div className="flex-1 overflow-y-auto pr-1">
                  {data?.recentTransactions.length === 0 ? (
                    <div className="flex items-center justify-center h-full min-h-[200px]">
                      <p className="text-sm text-muted">Tidak ada transaksi di {getMonthLabel(selectedMonth)}.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data?.recentTransactions.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between p-3 bg-lavender/40 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${tx.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {tx.type === 'income' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-ink">
                                {tx.note || (tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran')}
                              </p>
                              <p className="text-xs text-muted">{formatDate(tx.occurred_at)}</p>
                            </div>
                          </div>
                          <p className={`font-semibold text-sm ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                            {tx.type === 'income' ? '+' : '-'}{formatRupiah(Number(tx.amount))}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </DashboardShell>
  )
}