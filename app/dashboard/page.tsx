'use client'

import { useEffect, useState, useCallback } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { 
  TrendingUp, Download, ChevronDown, Sparkles,
  AlertTriangle, BookOpenCheck, ShoppingCart, Loader2, RefreshCw, ArrowUpRight, ArrowDownLeft
} from 'lucide-react'
import { monthRangeStr } from '@/lib/date'
import DashboardCharts from './DashboardCharts'
import { createClient } from '@/lib/supabase/client'
import { LOW_STOCK_THRESHOLD } from '@/lib/supabase/constants'

type ChartPoint = { date: string; income: number; expense: number }

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
  chartData?: ChartPoint[]
}

type LowStockItem = { id: string; name: string; stock: number; unit: string }

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
  return new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' }).format(new Date(year, month - 1, 1))
}

export default function DashboardPage() {
  const supabase = createClient()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue())
  const [isExporting, setIsExporting] = useState(false)
  
  // State AI
  const [insight, setInsight] = useState<string | null>(null)
  const [insightLoading, setInsightLoading] = useState(false)
  const [insightError, setInsightError] = useState<string | null>(null)
  
  // State Stok Menipis
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])

  const fetchDashboard = useCallback(async (month: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard?month=${month}`).then((r) => r.json())
      setData(res)
    } catch (err) {
      console.error("Gagal memuat dashboard", err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchLowStock = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: stockData } = await supabase
      .from('products')
      .select('id, name, stock, unit')
      .eq('user_id', user.id)
      .lte('stock', LOW_STOCK_THRESHOLD)
      .order('stock', { ascending: true })

    setLowStockItems(stockData || [])
  }, [supabase])

  async function generateInsight() {
    setInsightLoading(true)
    setInsightError(null)
    try {
      const res = await fetch(`/api/dashboard/insight?month=${selectedMonth}`)
      const result = await res.json()
      if (!res.ok) {
        setInsightError(result.error || 'Gagal membuat ringkasan')
        return
      }
      setInsight(result.narrative)
    } catch (err) {
      setInsightError('Terjadi kesalahan, coba lagi')
    } finally {
      setInsightLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard(selectedMonth)
    fetchLowStock()
    setInsight(null)
    setInsightError(null)
  }, [selectedMonth, fetchDashboard, fetchLowStock])

  async function handleDownloadReport() {
    setIsExporting(true)
    try {
      const [year, month] = selectedMonth.split('-').map(Number)
      const { from: fromDate, to: toDate } = monthRangeStr(year, month)
      const res = await fetch(`/api/transactions/export-excel?from=${fromDate}&to=${toDate}`)
      if (!res.ok) throw new Error('Gagal membuat laporan Excel')
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

  const chartData = data?.chartData || []
  
  // Tanggal Hari Ini untuk Header
  const todayLabel = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())

  return (
    <DashboardShell>
      <div className="w-full">
        {/* ===================== HEADER ===================== */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
          <div>
            <h1 className="text-[24px] font-extrabold tracking-tight text-ink m-0">Dashboard Keuangan </h1>
            <p className="text-mu mt-1 text-[14px]">{todayLabel}</p>
          </div>
          <div className="flex items-center gap-2 pb-1 sm:pb-0">
            <button 
              onClick={handleDownloadReport}
              disabled={isExporting || loading}
              className="flex items-center gap-2 bg-card border border-ln rounded-xl px-3.5 h-10 font-bold text-[14px] text-ink whitespace-nowrap hover:bg-so hover:text-br hover:border-br transition-colors disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span className="hidden sm:inline">{isExporting ? 'Membuat...' : 'Unduh Laporan'}</span>
            </button>
            <div className="relative">
               <input
                  type="month"
                  value={selectedMonth}
                  max={getCurrentMonthValue()}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <button className="flex items-center gap-2 bg-card border border-ln rounded-xl px-3.5 h-10 font-bold text-[14px] text-ink whitespace-nowrap hover:bg-so hover:text-br hover:border-br transition-colors">
                  {getMonthLabel(selectedMonth)} <ChevronDown className="w-4 h-4" />
                </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
             <div className="md:col-span-2 h-48 bg-card rounded-[18px]"></div>
             <div className="h-48 bg-card rounded-[18px]"></div>
          </div>
        ) : (
          <>
            {/* ===================== ROW 1: KARTU UTAMA & PERINGATAN ===================== */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              
              {/* Kartu Hero Laba Bersih */}
              <div className="lg:col-span-2 bg-gradient-to-br from-[#1E9B50] to-[#0F4C3A] text-white rounded-[18px] p-[18px] relative overflow-hidden">
                <div className="absolute -right-12 -top-12 w-[190px] h-[190px] border-[14px] border-white/10 rounded-full" />
                <div className="relative z-10">
                  <small className="opacity-85 font-semibold text-[14px] block">Laba bersih bulan {getMonthLabel(selectedMonth)}</small>
                  <div className="text-[32px] md:text-[40px] font-extrabold tracking-tight mt-1 mb-1 tabular-nums">
                    {formatRupiah(data?.netProfit || 0)}
                  </div>
                  
                  {data?.netProfit && data.netProfit > 0 ? (
                    <span className="inline-flex items-center bg-white/15 rounded-full px-2.5 py-1 text-[12px] font-bold">
                      <TrendingUp className="w-3 h-3 mr-1" /> Profit Positif
                    </span>
                  ) : (
                    <span className="inline-block h-6"></span>
                  )}

                  <div className="grid grid-cols-2 gap-2.5 mt-4">
                    <div className="bg-white/10 rounded-[14px] p-2.5 backdrop-blur-sm">
                      <small className="opacity-85 block text-[12px]">Pemasukan</small>
                      <b className="text-[16px] block tabular-nums">{formatRupiah(data?.totalIncome || 0)}</b>
                    </div>
                    <div className="bg-white/10 rounded-[14px] p-2.5 backdrop-blur-sm">
                      <small className="opacity-85 block text-[12px]">Pengeluaran</small>
                      <b className="text-[16px] block tabular-nums">{formatRupiah(data?.totalExpense || 0)}</b>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kartu Perlu Perhatian (Judul dikunci di atas) */}
              <div className="bg-card border border-ln rounded-[18px] p-[18px] flex flex-col">
                <h3 className="font-bold text-[15px] mb-3 text-ink shrink-0">Perlu perhatian</h3>
                
                <div className="space-y-2.5 flex-1">
                  {/* 1. Peringatan Stok (Hanya muncul jika ada barang menipis) */}
                  {lowStockItems.length > 0 && (
                    <div className="flex gap-2.5 items-center p-2.5 rounded-[12px] bg-rs">
                      <AlertTriangle className="w-5 h-5 text-rd shrink-0" />
                      <div className="text-[13px] text-ink leading-tight min-w-0">
                        <b className="block font-bold truncate">{lowStockItems.length} barang stok menipis</b>
                        <span className="text-mu block mt-0.5 truncate">
                          {lowStockItems.map(item => item.name).join(', ')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 2. Peringatan Kasbon */}
                  <div className={`flex gap-2.5 items-center p-2.5 rounded-[12px] ${data?.totalDebtRemaining && data.totalDebtRemaining > 0 ? 'bg-am' : 'bg-so'}`}>
                    <BookOpenCheck className={`w-5 h-5 shrink-0 ${data?.totalDebtRemaining && data.totalDebtRemaining > 0 ? 'text-[#9a6b00]' : 'text-br'}`} />
                    <div className="text-[13px] text-ink leading-tight min-w-0">
                      <b className="block font-bold">Piutang Kasbon</b>
                      <span className="text-mu block mt-0.5 truncate">
                        {data?.totalDebtRemaining && data.totalDebtRemaining > 0 
                          ? `Ada tunggakan sebesar ${formatRupiah(data.totalDebtRemaining)}` 
                          : 'Semua pelanggan lunas 👍'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* ===================== BANNER AI ===================== */}
            <div className="bg-so rounded-[18px] p-4 flex flex-col sm:flex-row sm:items-center gap-3.5 mb-4 border border-transparent">
              <Sparkles className="w-6 h-6 text-br shrink-0" />
              
              <div className="flex-1 text-[14px] text-mu m-0 leading-relaxed min-w-0">
                 {insightLoading ? (
                    <span className="flex items-center gap-2 text-ink font-medium"><Loader2 className="w-4 h-4 animate-spin text-br" /> AI sedang menyusun laporan...</span>
                 ) : insightError ? (
                    <span className="text-rd font-medium">{insightError}</span>
                 ) : insight ? (
                    <span className="text-ink font-medium">{insight}</span>
                 ) : (
                   <>
                     <b className="text-ink">Ringkasan AI</b><br/>
                     Minta AI merangkum laporan bulan ini dalam beberapa kalimat.
                   </>
                 )}
              </div>
              
              <button 
                onClick={generateInsight}
                disabled={insightLoading}
                className="bg-br text-white font-bold text-[14px] px-3.5 h-10 rounded-[12px] flex items-center gap-2 whitespace-nowrap shadow-[0_6px_14px_rgba(30,155,80,0.25)] hover:brightness-110 transition-all shrink-0 disabled:opacity-60"
              >
                {insight ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />} 
                {insight ? 'Buat Ulang' : 'Buat Ringkasan'}
              </button>
            </div>

            {/* ===================== ROW 2: GRAFIK & AKTIVITAS ===================== */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* Area Grafik */}
              <div className="lg:col-span-2 bg-card border border-ln rounded-[18px] p-[18px]">
                <div className="flex justify-between items-center mb-1.5">
                  <h3 className="font-bold text-[15px] m-0 text-ink">Grafik Bulan {getMonthLabel(selectedMonth)}</h3>
                </div>
                <div className="mt-2 -ml-5">
                   <DashboardCharts data={chartData} />
                </div>
              </div>

              {/* Aktivitas Terbaru (Dinamis dari Supabase) */}
              <div className="bg-card border border-ln rounded-[18px] p-[18px] flex flex-col h-full max-h-[400px]">
                <div className="flex justify-between items-center mb-2 shrink-0">
                  <h3 className="font-bold text-[15px] m-0 text-ink">Aktivitas terbaru</h3>
                  <a href="/transactions" className="text-br text-[12px] font-bold hover:underline">Semua</a>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-0 divide-y divide-ln">
                  {data?.recentTransactions.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-mu text-sm py-8">
                      Belum ada aktivitas transaksi.
                    </div>
                  ) : (
                    data?.recentTransactions.map((tx) => (
                      <div key={tx.id} className="flex items-center gap-3 py-[11px]">
                        <div className={`w-[36px] h-[36px] rounded-[11px] flex items-center justify-center shrink-0 ${
                          tx.type === 'income' ? 'bg-so text-br' : 'bg-rs text-rd'
                        }`}>
                          {tx.type === 'income' ? <ArrowDownLeft className="w-[20px] h-[20px]" /> : <ArrowUpRight className="w-[20px] h-[20px]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <b className="block text-[14px] text-ink truncate">
                            {tx.note || (tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran')}
                          </b>
                          <small className="block text-mu text-[12px] truncate mt-0.5">{formatDate(tx.occurred_at)}</small>
                        </div>
                        <span className={`font-extrabold text-[14px] shrink-0 ${tx.type === 'income' ? 'text-br' : 'text-rd'}`}>
                          {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                        </span>
                      </div>
                    ))
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