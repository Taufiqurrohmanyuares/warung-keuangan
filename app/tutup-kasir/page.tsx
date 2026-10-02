'use client'

import { useEffect, useState, useMemo } from 'react'
import { todayWIB } from '@/lib/date'
import DashboardShell from '@/components/DashboardShell'
import { Stempel, useStempel } from '@/components/Stempel'
import { CheckCircle2, AlertTriangle, RotateCcw, Loader2, Lock } from 'lucide-react'

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
        <div className="max-w-5xl mx-auto px-4 py-8 w-full">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-card border border-ln rounded-[14px] w-1/3" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-72 bg-card border border-ln rounded-[22px]" />
              <div className="h-72 bg-card border border-ln rounded-[22px]" />
            </div>
          </div>
        </div>
      </DashboardShell>
    )
  }

  const totalOmzet = summary.cash_sales + summary.qris_sales

  return (
    <DashboardShell>
      <Stempel visible={stempel.visible} label={stempel.label} />
      <div className="max-w-5xl mx-auto w-full pb-16 lg:pb-10">

        {/* ===================== HEADER ===================== */}
        <div className="mb-6">
          <h1 className="text-[26px] font-extrabold tracking-tight text-ink m-0">Tutup Kasir</h1>
          <p className="text-mu mt-1 text-[14px] capitalize">{formatTanggal(summary.date)}</p>
        </div>

        {summary.already_closed && summary.closing ? (
          /* ===================== KONDISI SUDAH DITUTUP ===================== */
          <div className="bg-card border border-ln rounded-[22px] p-6 shadow-sm max-w-xl mx-auto">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-ln">
              <div className="w-10 h-10 rounded-[12px] bg-so text-br flex items-center justify-center"><Lock className="w-5 h-5" /></div>
              <div>
                <h2 className="text-[17px] font-bold text-ink m-0">Kasir Hari Ini Sudah Ditutup</h2>
                <p className="text-xs text-mu mt-0.5">
                  Ditutup pukul {new Date(summary.closing.closed_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            <div className="space-y-3.5 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-mu font-medium">Modal Kas Awal</span>
                <span className="font-bold text-ink">{formatRupiah(summary.closing.opening_cash)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mu font-medium">+ Penjualan Tunai</span>
                <span className="font-bold text-ink">{formatRupiah(summary.closing.cash_sales)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mu font-medium">- Pengeluaran</span>
                <span className="font-bold text-rd">{formatRupiah(summary.closing.cash_expenses)}</span>
              </div>
              <div className="flex justify-between border-t border-ln pt-3">
                <span className="text-ink font-bold">Kas Seharusnya</span>
                <span className="font-extrabold text-ink">{formatRupiah(summary.closing.expected_cash)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink font-bold">Kas Dihitung (Fisik)</span>
                <span className="font-extrabold text-ink">{formatRupiah(summary.closing.counted_cash)}</span>
              </div>
            </div>

            <div className={`rounded-[14px] p-4 flex items-center justify-between mb-6 border ${
              summary.closing.difference === 0 ? 'bg-so border-br/30' : 'bg-rs border-rd/30'
            }`}>
              <div className="flex items-center gap-2">
                {summary.closing.difference === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-br" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rd" />
                )}
                <span className={`text-sm font-bold ${summary.closing.difference === 0 ? 'text-ink' : 'text-rd'}`}>
                  {summary.closing.difference === 0 ? 'Pas, tidak ada selisih' : summary.closing.difference > 0 ? 'Kas Lebih' : 'Kas Kurang'}
                </span>
              </div>
              {summary.closing.difference !== 0 && (
                <span className="text-[16px] font-extrabold text-rd">
                  {formatRupiah(Math.abs(summary.closing.difference))}
                </span>
              )}
            </div>

            {summary.closing.note && (
              <div className="bg-bg border border-ln rounded-[14px] p-4 mb-6">
                <p className="text-[11px] font-bold text-mu uppercase tracking-wider mb-1">Catatan Penutupan</p>
                <p className="text-sm text-ink font-medium">{summary.closing.note}</p>
              </div>
            )}

            <button
              onClick={handleReopen}
              disabled={reopening}
              className="w-full flex items-center justify-center gap-2 bg-bg border border-ln hover:bg-so text-ink rounded-[14px] py-3.5 text-sm font-bold transition-all disabled:opacity-50"
            >
              {reopening ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4 text-mu" />}
              Buka Lagi (Koreksi Input)
            </button>
          </div>
        ) : (
          /* ===================== KONDISI BELUM DITUTUP (2 KOLOM SEPERTI REFERENSI) ===================== */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

            {/* KOLOM KIRI: Ringkasan Hari Ini */}
            <div className="bg-card border border-ln rounded-[22px] p-6 shadow-sm space-y-4">
              <h2 className="text-[17px] font-extrabold text-ink m-0 pb-3 border-b border-ln">Ringkasan hari ini</h2>

              <div className="space-y-4 pt-1">
                <div className="flex justify-between items-center pb-3 border-b border-ln/60">
                  <span className="text-sm font-medium text-ink">Tunai</span>
                  <span className="text-sm font-extrabold text-ink">{formatRupiah(summary.cash_sales)}</span>
                </div>

                <div className="flex justify-between items-center pb-3 border-b border-ln/60">
                  <span className="text-sm font-medium text-ink">QRIS</span>
                  <span className="text-sm font-extrabold text-ink">{formatRupiah(summary.qris_sales)}</span>
                </div>

                <div className="flex justify-between items-center pb-3 border-b border-ln/60">
                  <span className="text-sm font-medium text-ink">Pengeluaran</span>
                  <span className="text-sm font-extrabold text-rd">-{formatRupiah(summary.cash_expenses)}</span>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <span className="text-[15px] font-bold text-ink">Total omzet</span>
                  <span className="text-[20px] font-extrabold text-br">{formatRupiah(totalOmzet)}</span>
                </div>
              </div>
            </div>

            {/* KOLOM KANAN: Hitung Kas di Laci */}
            <form onSubmit={handleSubmit} className="bg-card border border-ln rounded-[22px] p-6 shadow-sm space-y-5">
              <h2 className="text-[17px] font-extrabold text-ink m-0 pb-3 border-b border-ln">Hitung kas di laci</h2>

              <div>
                <label className="text-xs font-extrabold text-ink block mb-2">Modal kas awal</label>
                <input
                  type="number"
                  min={0}
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  className="w-full px-4 py-3 bg-card border border-ln rounded-[14px] text-sm font-bold text-ink outline-none focus:border-br transition-colors"
                />
                <p className="text-mu text-[11px] mt-1.5">Terisi dari penutupan kemarin</p>
              </div>

              {/* Kotak Hijau Kas Seharusnya */}
              <div className="bg-so border border-br/30 rounded-[14px] p-4 flex justify-between items-center shadow-sm">
                <span className="text-xs font-bold text-br">Kas seharusnya</span>
                <span className="text-[18px] font-extrabold text-ink">{formatRupiah(expectedCash)}</span>
              </div>

              <div>
                <label className="text-xs font-extrabold text-ink block mb-2">Uang tunai hasil hitung</label>
                <input
                  type="number"
                  min={0}
                  autoFocus
                  placeholder="Hitung uang di laci, lalu isi di sini"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  className="w-full px-4 py-3 bg-card border border-ln rounded-[14px] text-sm font-bold text-ink placeholder:text-mu/60 outline-none focus:border-br transition-colors"
                />
              </div>

              {difference !== null && difference !== 0 && (
                <div className={`rounded-[14px] p-3.5 flex items-center justify-between border ${difference > 0 ? 'bg-so border-br/30' : 'bg-rs border-rd/30'}`}>
                  <span className={`text-xs font-bold ${difference > 0 ? 'text-br' : 'text-rd'}`}>
                    {difference > 0 ? 'Kas Lebih' : 'Kas Kurang'}
                  </span>
                  <span className={`text-[15px] font-extrabold ${difference > 0 ? 'text-br' : 'text-rd'}`}>
                    {formatRupiah(Math.abs(difference))}
                  </span>
                </div>
              )}

              {difference !== null && difference !== 0 && (
                <div>
                  <label className="text-xs font-extrabold text-ink block mb-1.5">Catatan Selisih</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Alasan selisih..."
                    rows={2}
                    className="w-full px-4 py-3 bg-card border border-ln rounded-[14px] text-sm text-ink outline-none focus:border-br transition-colors resize-none"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || countedCash === ''}
                className="w-full flex items-center justify-center gap-2 bg-br hover:brightness-110 text-white rounded-[14px] py-4 text-sm font-bold transition-all disabled:opacity-50 shadow-[0_6px_14px_rgba(30,155,80,0.25)]"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {submitting ? 'Memproses...' : 'Tutup Kasir'}
              </button>
            </form>

          </div>
        )}
      </div>
    </DashboardShell>
  )
}