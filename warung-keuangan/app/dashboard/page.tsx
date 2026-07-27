'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import { Wallet, TrendingUp, TrendingDown, AlertCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
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
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/dashboard').then((r) => r.json())
        setData(res)
      } catch (err) {
        console.error("Gagal memuat dashboard", err)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  // Data untuk grafik Recharts
  const chartData = [
    { name: 'Pemasukan', jumlah: data?.totalIncome || 0 },
    { name: 'Pengeluaran', jumlah: data?.totalExpense || 0 },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard Keuangan</h1>
          <p className="text-sm text-gray-500">Ringkasan performa keuangan warung Anda secara keseluruhan</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse bg-gray-200 h-32 rounded-2xl w-full"></div>
            ))}
          </div>
        ) : (
          <>
            {/* Kartu Ringkasan Statistik */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              
              {/* Laba Bersih */}
              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Laba Bersih</span>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Wallet className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-xl font-bold text-gray-900">{formatRupiah(data?.netProfit || 0)}</p>
              </div>

              {/* Total Pemasukan */}
              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Total Pemasukan</span>
                  <div className="p-2 bg-green-50 text-green-600 rounded-xl">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-xl font-bold text-green-600">{formatRupiah(data?.totalIncome || 0)}</p>
              </div>

              {/* Total Pengeluaran */}
              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Total Pengeluaran</span>
                  <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-xl font-bold text-red-600">{formatRupiah(data?.totalExpense || 0)}</p>
              </div>

              {/* Total Sisa Kasbon */}
              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Piutang Kasbon</span>
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-xl font-bold text-orange-600">{formatRupiah(data?.totalDebtRemaining || 0)}</p>
              </div>

            </div>

            {/* Bagian Grafik Visual */}
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 mb-8">
              <h3 className="text-base font-bold text-gray-900 mb-4">Grafik Perbandingan Keuangan</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} />
                    <YAxis tickLine={false} />
                    <Tooltip formatter={(value: any) => formatRupiah(Number(value))} />
                    <Bar dataKey="jumlah" fill="#111827" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Transaksi Terakhir */}
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
              <h3 className="text-base font-bold text-gray-900 mb-4">Aktivitas Transaksi Terbaru</h3>
              {data?.recentTransactions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">Belum ada transaksi tercatat.</p>
              ) : (
                <div className="space-y-3">
                  {data?.recentTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${tx.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {tx.type === 'income' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{tx.note || (tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran')}</p>
                          <p className="text-xs text-gray-500">{tx.occurred_at}</p>
                        </div>
                      </div>
                      <p className={`font-bold text-sm ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatRupiah(Number(tx.amount))}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}