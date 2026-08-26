'use client'

import { useEffect, useState, useMemo } from 'react'
// Tambahkan di baris import paling atas:
import { todayWIB } from '@/lib/date'
import DashboardShell from '@/components/DashboardShell'
import { Stempel, useStempel } from '@/components/Stempel'
import {
  Wallet, Banknote, QrCode, TrendingDown, Receipt, CheckCircle2,
  AlertTriangle, RotateCcw, Loader2, Lock,
} from 'lucide-react'

type Summary = {
  date: string
  already_closed: boolean
  closing: {
    opening_cash: number
    cash_sales: number
    qris_sales: number
    cash_expenses: number
    expected_cash: number
    counted_cash: number
    difference: number
    transaction_count: number
    note: string | null
    closed_at: string
  } | null
  suggested_opening_cash: number
  cash_sales: number
  qris_sales: number
  cash_expenses: number
  transaction_count: number
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function formatTanggal(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function TutupKasirPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [reopening, setReopening] = useState(false)
  const stempel = useStempel()

  const [openingCash, setOpeningCash] = useState('')
  const [countedCash, setCountedCash] = useState('')
  const [note, setNote] = useState('')

  async function fetchSummary() {
    setLoading(true)
    try {
      const res = await fetch(`/api/tutup-kasir?date=${todayWIB()}`)
      const data = await res.json()
      setSummary(data)
      if (!data.already_closed) {
        setOpeningCash(String(data.suggested_opening_cash ?? 0))
      }
    } catch (err) {
      console.error('Gagal memuat ringkasan kas', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSummary()
  }, [])

  const expectedCash = useMemo(() => {
    if (!summary) return 0
    return (Number(openingCash) || 0) + summary.cash_sales - summary.cash_expenses
  }, [openingCash, summary])

  const difference = useMemo(() => {
    if (countedCash === '') return null
    return (Number(countedCash) || 0) - expectedCash
  }, [countedCash, expectedCash])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!summary || countedCash === '') return

    setSubmitting(true)
    try {
      const res = await fetch('/api/tutup-kasir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: summary.date,
          opening_cash: Number(openingCash) || 0,
          counted_cash: Number(countedCash) || 0,
          cash_sales: summary.cash_sales,
          qris_sales: summary.qris_sales,
          cash_expenses: summary.cash_expenses,
          transaction_count: summary.transaction_count,
          note,
        }),
      })

      if (res.ok) {
        stempel.show('Kasir ditutup')
        setNote('')
        setCountedCash('')
        await fetchSummary()
      } else {
        const result = await res.json().catch(() => null)
        alert(result?.error || 'Gagal menyimpan penutupan kasir')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReopen() {
    if (!summary) return
    if (!confirm('Buka lagi penutupan hari ini? Data penutupan yang sudah tersimpan akan dihapus dan bisa diisi ulang.')) return

    setReopening(true)
    try {
      const res = await fetch(`/api/tutup-kasir?date=${summary.date}`, { method: 'DELETE' })
      if (res.ok) {
        stempel.show('Dibuka lagi')
        await fetchSummary()
      } else {
        alert('Gagal membuka lagi penutupan kasir')
      }
    } finally {
      setReopening(false)
    }
  }

  if (loading || !summary) {
    return (
      <DashboardShell>
        <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-white/60 rounded-xl w-1/2" />
            <div className="h-40 bg-white/60 rounded-2xl" />
            <div className="h-64 bg-white/60 rounded-2xl" />
          </div>
        </div>
      </DashboardShell>
    )
  }

  const totalOmzet = summary.cash_sales + summary.qris_sales

  return (
    <DashboardShell>
      <Stempel visible={stempel.visible} label={stempel.label} />
      <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink tracking-tight">Tutup Kasir</h1>
          <p className="text-sm text-muted mt-1 capitalize">{formatTanggal(summary.date)}</p>
        </div>

        {/* ===== RINGKASAN OMZET HARI INI ===== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white shadow-sm rounded-2xl p-4">
            <div className="p-2 bg-primary-light rounded-lg w-fit mb-2"><Banknote className="w-4 h-4 text-primary" /></div>
            <p className="text-xs text-muted mb-0.5">Tunai</p>
            <p className="text-sm font-bold text-ink">{formatRupiah(summary.cash_sales)}</p>
          </div>
          <div className="bg-white shadow-sm rounded-2xl p-4">
            <div className="p-2 bg-primary-light rounded-lg w-fit mb-2"><QrCode className="w-4 h-4 text-primary" /></div>
            <p className="text-xs text-muted mb-0.5">QRIS</p>
            <p className="text-sm font-bold text-ink">{formatRupiah(summary.qris_sales)}</p>
          </div>
          <div className="bg-white shadow-sm rounded-2xl p-4">
            <div className="p-2 bg-red-50 rounded-lg w-fit mb-2"><TrendingDown className="w-4 h-4 text-red-600" /></div>
            <p className="text-xs text-muted mb-0.5">Pengeluaran</p>
            <p className="text-sm font-bold text-red-600">{formatRupiah(summary.cash_expenses)}</p>
          </div>
          <div className="bg-white shadow-sm rounded-2xl p-4">
            <div className="p-2 bg-primary-light rounded-lg w-fit mb-2"><Receipt className="w-4 h-4 text-primary" /></div>
            <p className="text-xs text-muted mb-0.5">Total Omzet</p>
            <p className="text-sm font-bold text-ink">{formatRupiah(totalOmzet)}</p>
          </div>
        </div>

        {summary.already_closed && summary.closing ? (
          /* ===== SUDAH DITUTUP: tampilkan hasil ===== */
          <div className="bg-white shadow-sm rounded-2xl p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 bg-primary-light rounded-lg"><Lock className="w-4 h-4 text-primary" /></div>
              <div>
                <h2 className="text-base font-bold text-ink">Kasir Hari Ini Sudah Ditutup</h2>
                <p className="text-xs text-muted">
                  Ditutup jam {new Date(summary.closing.closed_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            <div className="space-y-2.5 text-sm mb-5">
              <div className="flex justify-between">
                <span className="text-muted">Modal Kas Awal</span>
                <span className="font-medium text-ink">{formatRupiah(summary.closing.opening_cash)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">+ Penjualan Tunai</span>
                <span className="font-medium text-ink">{formatRupiah(summary.closing.cash_sales)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">- Pengeluaran</span>
                <span className="font-medium text-ink">{formatRupiah(summary.closing.cash_expenses)}</span>
              </div>
              <div className="flex justify-between border-t border-lavender pt-2.5">
                <span className="text-muted font-medium">Kas Seharusnya</span>
                <span className="font-bold text-ink">{formatRupiah(summary.closing.expected_cash)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted font-medium">Kas Dihitung (fisik)</span>
                <span className="font-bold text-ink">{formatRupiah(summary.closing.counted_cash)}</span>
              </div>
            </div>

            <div className={`rounded-xl p-4 flex items-center justify-between mb-5 ${
              summary.closing.difference === 0 ? 'bg-primary-light' : 'bg-red-50'
            }`}>
              <div className="flex items-center gap-2">
                {summary.closing.difference === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-medium ${summary.closing.difference === 0 ? 'text-ink' : 'text-red-700'}`}>
                  {summary.closing.difference === 0 ? 'Pas, tidak ada selisih' : summary.closing.difference > 0 ? 'Kas Lebih' : 'Kas Kurang'}
                </span>
              </div>
              {summary.closing.difference !== 0 && (
                <span className="text-lg font-black text-red-600">
                  {formatRupiah(Math.abs(summary.closing.difference))}
                </span>
              )}
            </div>

            {summary.closing.note && (
              <div className="bg-lavender/40 rounded-xl p-4 mb-5">
                <p className="text-xs font-bold text-muted uppercase tracking-wide mb-1">Catatan</p>
                <p className="text-sm text-ink">{summary.closing.note}</p>
              </div>
            )}

            <button
              onClick={handleReopen}
              disabled={reopening}
              className="w-full flex items-center justify-center gap-2 bg-lavender/60 hover:bg-lavender text-ink rounded-xl py-3 text-sm font-bold transition-colors disabled:opacity-50"
            >
              {reopening ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              Buka Lagi (kalau salah input)
            </button>
          </div>
        ) : (
          /* ===== BELUM DITUTUP: form hitung kas ===== */
          <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-ink mb-1">Hitung Kas di Laci</h2>
            <p className="text-xs text-muted mb-4">Isi modal awal kas dan hasil hitung fisik uang tunai sekarang.</p>

            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wide mb-1.5 block">Modal Kas Awal Hari Ini</label>
              <input
                type="number"
                min={0}
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                className="w-full px-4 py-3 bg-lavender/40 border border-transparent rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white transition-colors"
              />
              <p className="text-[11px] text-muted mt-1">Otomatis diisi dari sisa kas penutupan sebelumnya — boleh diubah kalau beda.</p>
            </div>

            <div className="bg-lavender/40 rounded-xl p-4 flex justify-between items-center">
              <span className="text-sm font-medium text-muted">Kas Seharusnya di Laci</span>
              <span className="text-lg font-black text-ink">{formatRupiah(expectedCash)}</span>
            </div>

            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wide mb-1.5 block">Uang Tunai Hasil Hitung Fisik</label>
              <div className="relative">
                <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-primary w-4 h-4" />
                <input
                  type="number"
                  min={0}
                  autoFocus
                  placeholder="Hitung uang di laci, lalu masukkan di sini"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-lavender/40 border border-transparent rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white transition-colors"
                />
              </div>
            </div>

            {difference !== null && (
              <div className={`rounded-xl p-4 flex items-center justify-between ${
                difference === 0 ? 'bg-primary-light' : 'bg-red-50'
              }`}>
                <div className="flex items-center gap-2">
                  {difference === 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${difference === 0 ? 'text-ink' : 'text-red-700'}`}>
                    {difference === 0 ? 'Pas, tidak ada selisih' : difference > 0 ? 'Kas Lebih' : 'Kas Kurang'}
                  </span>
                </div>
                {difference !== 0 && (
                  <span className="text-lg font-black text-red-600">{formatRupiah(Math.abs(difference))}</span>
                )}
              </div>
            )}

            {difference !== null && difference !== 0 && (
              <div>
                <label className="text-xs font-bold text-muted uppercase tracking-wide mb-1.5 block">Catatan (kenapa selisih?)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Misal: kembalian kurang pas, atau uang buat beli galon..."
                  rows={2}
                  className="w-full px-4 py-3 bg-lavender/40 border border-transparent rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white transition-colors resize-none"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || countedCash === ''}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-xl py-3.5 text-sm font-bold transition-colors disabled:opacity-50 shadow-sm shadow-primary/30"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {submitting ? 'Menyimpan...' : 'Tutup Kasir Sekarang'}
            </button>
          </form>
        )}
      </div>
    </DashboardShell>
  )
}