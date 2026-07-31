'use client'

import { useEffect, useState, useTransition, useMemo } from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import DashboardShell from '@/components/DashboardShell'
import {
  User, Phone, Wallet, Calendar, AlignLeft, CheckCircle2, Clock,
  Search, MessageCircle, AlertTriangle, Users, Banknote,
} from 'lucide-react'

import { debtSchema, DebtFormValues } from '@/lib/supabase/validations/debt'
import { createDebt, payDebt } from '@/server/actions/debt'

type Debt = {
  id: string
  customer_name: string
  customer_phone: string | null
  amount: number
  paid_amount: number
  status: 'unpaid' | 'partial' | 'paid'
  due_date: string | null
  notes: string | null
  created_at: string
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

function getDaysOverdue(dueDate: string | null): number | null {
  if (!dueDate) return null
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.round((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays > 0 ? diffDays : 0
}

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [isPending, startTransition] = useTransition()

  const [payingId, setPayingId] = useState<string | null>(null)
  const [payAmount, setPayAmount] = useState<string>('')
  const [isPaying, startPayingTransition] = useTransition()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'belum_lunas' | 'lunas' | 'semua'>('belum_lunas')

  async function handlePay(debtId: string, amount: number) {
    if (!amount || amount <= 0) return alert('Masukkan nominal yang valid')

    startPayingTransition(async () => {
      const result = await payDebt(debtId, amount)
      if (result?.error) {
        alert('Gagal membayar: ' + result.error)
      } else {
        setPayingId(null)
        setPayAmount('')
        await loadData()
      }
    })
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DebtFormValues>({
    resolver: zodResolver(debtSchema) as any,
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      amount: 0,
      due_date: '',
      notes: '',
    },
  })

  async function loadData() {
    setLoadingData(true)
    try {
      const res = await fetch('/api/debts').then((r) => r.json())
      setDebts(res || [])
    } catch (error) {
      console.error("Gagal memuat data kasbon", error)
      setDebts([])
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const onSubmit: SubmitHandler<DebtFormValues> = (data) => {
    startTransition(async () => {
      const payload = {
        ...data,
        customer_phone: data.customer_phone === '' ? null : data.customer_phone,
        due_date: data.due_date === '' ? null : data.due_date,
        notes: data.notes === '' ? null : data.notes,
      }

      const result = await createDebt(payload as any)

      if (result?.error) {
        alert('Gagal menyimpan kasbon: ' + result.error)
        return
      }

      reset({
        customer_name: '',
        customer_phone: '',
        amount: 0,
        due_date: '',
        notes: '',
      })
      await loadData()
    })
  }

  // ===== Ringkasan (KPI) =====
  const summary = useMemo(() => {
    const belumLunas = debts.filter((d) => d.status !== 'paid')
    const totalPiutang = belumLunas.reduce((sum, d) => sum + (Number(d.amount) - Number(d.paid_amount)), 0)
    const jumlahTelat = belumLunas.filter((d) => {
      const overdue = getDaysOverdue(d.due_date)
      return overdue !== null && overdue > 0
    }).length
    return { totalPiutang, jumlahPelanggan: belumLunas.length, jumlahTelat }
  }, [debts])

  // ===== Filter + Sortir: telat paling atas, lalu jatuh tempo terdekat, lalu tanpa tanggal =====
  const displayedDebts = useMemo(() => {
    let list = debts.filter((d) => {
      if (filterStatus === 'belum_lunas') return d.status !== 'paid'
      if (filterStatus === 'lunas') return d.status === 'paid'
      return true
    })

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter((d) => d.customer_name.toLowerCase().includes(q))
    }

    return [...list].sort((a, b) => {
      const overdueA = getDaysOverdue(a.due_date) || 0
      const overdueB = getDaysOverdue(b.due_date) || 0
      if (overdueA !== overdueB) return overdueB - overdueA
      if (!a.due_date && b.due_date) return 1
      if (a.due_date && !b.due_date) return -1
      if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      return 0
    })
  }, [debts, filterStatus, searchQuery])

  return (
    <DashboardShell>
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink tracking-tight">Kasbon</h1>
          <p className="text-sm text-muted mt-1">Catat dan pantau utang pelanggan warung Anda</p>
        </div>

        {/* ===== RINGKASAN ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white shadow-sm rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted">Total Piutang</span>
              <div className="p-2 bg-primary-light rounded-lg"><Banknote className="w-4 h-4 text-primary" /></div>
            </div>
            <p className="text-xl font-bold text-ink">{formatRupiah(summary.totalPiutang)}</p>
          </div>
          <div className="bg-white shadow-sm rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted">Pelanggan Berutang</span>
              <div className="p-2 bg-primary-light rounded-lg"><Users className="w-4 h-4 text-primary" /></div>
            </div>
            <p className="text-xl font-bold text-ink">{summary.jumlahPelanggan} Orang</p>
          </div>
          <div className={`rounded-2xl p-5 shadow-sm ${summary.jumlahTelat > 0 ? 'bg-red-50' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-medium ${summary.jumlahTelat > 0 ? 'text-red-600' : 'text-muted'}`}>Sudah Jatuh Tempo</span>
              <div className={`p-2 rounded-lg ${summary.jumlahTelat > 0 ? 'bg-red-100' : 'bg-primary-light'}`}>
                <AlertTriangle className={`w-4 h-4 ${summary.jumlahTelat > 0 ? 'text-red-600' : 'text-primary'}`} />
              </div>
            </div>
            <p className={`text-xl font-bold ${summary.jumlahTelat > 0 ? 'text-red-600' : 'text-ink'}`}>{summary.jumlahTelat} Orang</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* KOLOM KIRI: Form Kasbon */}
          <div className="lg:col-span-1 sticky top-6">
            <form onSubmit={handleSubmit(onSubmit as any)} className="bg-white shadow-sm rounded-2xl p-6">
              <h2 className="text-lg font-bold text-ink mb-5">Kasbon Baru</h2>

              <div className="space-y-4">
                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-muted" />
                    </div>
                    <input
                      type="text"
                      placeholder="Nama Pelanggan (Wajib)"
                      {...register('customer_name')}
                      className={`w-full pl-10 pr-4 py-3 bg-lavender/40 border rounded-xl text-sm outline-none transition-all ${
                        errors.customer_name ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-transparent focus:ring-2 focus:ring-primary/30 focus:bg-white'
                      }`}
                    />
                  </div>
                  {errors.customer_name && <p className="text-red-500 text-xs mt-1 ml-1">{errors.customer_name.message}</p>}
                </div>

                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-muted" />
                    </div>
                    <input
                      type="tel"
                      placeholder="Nomor HP / WhatsApp (Opsional)"
                      {...register('customer_phone')}
                      className="w-full pl-10 pr-4 py-3 bg-lavender/40 border border-transparent rounded-xl text-sm focus:ring-2 focus:ring-primary/30 focus:bg-white outline-none transition-all"
                    />
                  </div>
                  <p className="text-muted text-xs mt-1 ml-1">Isi nomor HP supaya bisa kirim reminder via WhatsApp</p>
                </div>

                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Wallet className="h-5 w-5 text-muted" />
                    </div>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="Total Pinjaman/Kasbon (Wajib)"
                      {...register('amount', { valueAsNumber: true })}
                      className={`w-full pl-10 pr-4 py-3 bg-lavender/40 border rounded-xl text-sm outline-none transition-all ${
                        errors.amount ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-transparent focus:ring-2 focus:ring-primary/30 focus:bg-white'
                      }`}
                    />
                  </div>
                  {errors.amount && <p className="text-red-500 text-xs mt-1 ml-1">{errors.amount.message}</p>}
                </div>

                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-muted" />
                    </div>
                    <input
                      type="date"
                      {...register('due_date')}
                      className="w-full pl-10 pr-4 py-3 bg-lavender/40 border border-transparent rounded-xl text-sm focus:ring-2 focus:ring-primary/30 focus:bg-white outline-none transition-all text-ink"
                    />
                  </div>
                  <p className="text-muted text-xs mt-1 ml-1">Batas waktu pembayaran (Opsional)</p>
                </div>

                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <AlignLeft className="h-5 w-5 text-muted" />
                    </div>
                    <input
                      type="text"
                      placeholder="Catatan pembelian (Opsional)"
                      {...register('notes')}
                      className="w-full pl-10 pr-4 py-3 bg-lavender/40 border border-transparent rounded-xl text-sm focus:ring-2 focus:ring-primary/30 focus:bg-white outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full mt-6 bg-primary hover:bg-primary-dark text-white rounded-xl py-3 text-sm font-medium transition-colors disabled:opacity-50 flex justify-center items-center gap-2 shadow-sm shadow-primary/30"
              >
                {isPending ? 'Menyimpan...' : 'Simpan Kasbon Baru'}
              </button>
            </form>
          </div>

          {/* KOLOM KANAN: Daftar Kasbon */}
          <div className="lg:col-span-2">

            <div className="mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-ink">Daftar Kasbon</h2>
                <span className="text-xs text-muted">Menampilkan {displayedDebts.length} data</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-muted" />
                  </div>
                  <input
                    type="text"
                    placeholder="Cari nama pelanggan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
                  />
                </div>

                <div className="flex bg-white rounded-xl p-1 shadow-sm">
                  <button
                    onClick={() => setFilterStatus('belum_lunas')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterStatus === 'belum_lunas' ? 'bg-primary text-white' : 'text-muted hover:bg-lavender/50'}`}
                  >
                    Belum Lunas
                  </button>
                  <button
                    onClick={() => setFilterStatus('lunas')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterStatus === 'lunas' ? 'bg-green-600 text-white' : 'text-muted hover:bg-lavender/50'}`}
                  >
                    Lunas
                  </button>
                  <button
                    onClick={() => setFilterStatus('semua')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterStatus === 'semua' ? 'bg-ink text-white' : 'text-muted hover:bg-lavender/50'}`}
                  >
                    Semua
                  </button>
                </div>
              </div>
            </div>

            {loadingData ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse bg-white/60 h-28 rounded-2xl w-full"></div>
                ))}
              </div>
            ) : displayedDebts.length === 0 ? (
              <div className="bg-white/60 border-2 border-dashed border-borderc rounded-2xl py-12 flex flex-col items-center justify-center text-center">
                <CheckCircle2 className="h-10 w-10 text-primary mb-2 opacity-50" />
                <p className="text-muted text-sm">
                  {filterStatus === 'belum_lunas' ? 'Bagus! Tidak ada kasbon yang belum dibayar.' : 'Tidak ada data yang cocok.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayedDebts.map((debt) => {
                  const sisaUtang = Number(debt.amount || 0) - Number(debt.paid_amount || 0)
                  const progress = debt.amount > 0 ? Math.min(100, (Number(debt.paid_amount) / Number(debt.amount)) * 100) : 0
                  const overdueDays = getDaysOverdue(debt.due_date)
                  const isOverdue = debt.status !== 'paid' && overdueDays !== null && overdueDays > 0
                  const waMessage = encodeURIComponent(
                    `Halo ${debt.customer_name}, mau ingatkan kasbon di warung sebesar ${formatRupiah(sisaUtang)}${debt.due_date ? ` yang jatuh tempo ${formatDate(debt.due_date)}` : ''}. Terima kasih 🙏`
                  )

                  return (
                    <div
                      key={debt.id}
                      className={`bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all ${isOverdue ? 'ring-2 ring-red-200' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                        <div>
                          <h3 className="font-bold text-ink text-lg flex items-center gap-2 flex-wrap">
                            {debt.customer_name}
                            {debt.status === 'paid' && <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-md font-medium">Lunas</span>}
                            {debt.status === 'partial' && !isOverdue && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-md font-medium">Nyicil</span>}
                            {debt.status === 'unpaid' && !isOverdue && <span className="px-2 py-0.5 bg-primary-light text-primary text-xs rounded-md font-medium">Belum Bayar</span>}
                            {isOverdue && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-md font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Telat {overdueDays} hari
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-muted mt-1 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" /> {formatDate(debt.created_at)}
                            {debt.due_date && ` · Jatuh tempo ${formatDate(debt.due_date)}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">Total Utang</p>
                          <p className="font-bold text-ink text-lg">{formatRupiah(Number(debt.amount || 0))}</p>
                        </div>
                      </div>

                      {debt.status !== 'paid' && Number(debt.paid_amount) > 0 && (
                        <div className="mb-3">
                          <div className="h-1.5 bg-lavender rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                          </div>
                          <p className="text-xs text-muted mt-1">Sudah dibayar {formatRupiah(Number(debt.paid_amount))} ({Math.round(progress)}%)</p>
                        </div>
                      )}

                      <div className="bg-lavender/40 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">Sisa Utang</p>
                          <p className="font-black text-red-600 text-lg">{formatRupiah(sisaUtang)}</p>
                        </div>

                        {debt.status !== 'paid' && (
                          <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
                            {debt.customer_phone && (
                              <a
                                href={`https://wa.me/${debt.customer_phone.replace(/\D/g, '')}?text=${waMessage}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                              >
                                <MessageCircle className="w-4 h-4" /> Ingatkan
                              </a>
                            )}

                            {payingId === debt.id ? (
                              <div className="flex items-center gap-2 w-full sm:w-auto">
                                <input
                                  type="number"
                                  placeholder="Nominal..."
                                  value={payAmount}
                                  onChange={(e) => setPayAmount(e.target.value)}
                                  className="w-full sm:w-32 px-3 py-2 bg-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30"
                                />
                                <button
                                  onClick={() => handlePay(debt.id, Number(payAmount))}
                                  disabled={isPaying}
                                  className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap disabled:opacity-50"
                                >
                                  {isPaying ? '...' : 'Simpan'}
                                </button>
                                <button
                                  onClick={() => { setPayingId(null); setPayAmount(''); }}
                                  className="bg-white text-muted px-3 py-2 rounded-lg text-sm font-medium hover:bg-lavender/60 transition-colors"
                                >
                                  Batal
                                </button>
                              </div>
                            ) : (
                              <div className="flex gap-2 w-full sm:w-auto">
                                <button
                                  onClick={() => handlePay(debt.id, sisaUtang)}
                                  disabled={isPaying}
                                  className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                                >
                                  Lunas Sekalian
                                </button>
                                <button
                                  onClick={() => setPayingId(debt.id)}
                                  className="flex-1 sm:flex-none bg-white text-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-light transition-colors shadow-sm"
                                >
                                  Cicil
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

          </div>
        </div>
      </div>
    </DashboardShell>
  )
}