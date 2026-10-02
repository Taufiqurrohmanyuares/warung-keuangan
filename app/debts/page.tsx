'use client'

import { useEffect, useState, useTransition, useMemo } from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import DashboardShell from '@/components/DashboardShell'
import {
  User, Phone, Wallet, Calendar, AlignLeft, CheckCircle2, Clock,
  Search, MessageCircle, AlertTriangle, Users, Banknote, Loader2, Plus, X
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
  
  // State untuk Modal Form Kasbon Baru
  const [isModalOpen, setIsModalOpen] = useState(false)

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
      setIsModalOpen(false)
      await loadData()
    })
  }

  const summary = useMemo(() => {
    const belumLunas = debts.filter((d) => d.status !== 'paid')
    const totalPiutang = belumLunas.reduce((sum, d) => sum + (Number(d.amount) - Number(d.paid_amount)), 0)
    const jumlahTelat = belumLunas.filter((d) => {
      const overdue = getDaysOverdue(d.due_date)
      return overdue !== null && overdue > 0
    }).length
    return { totalPiutang, jumlahPelanggan: belumLunas.length, jumlahTelat }
  }, [debts])

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
      <div className="w-full pb-16 lg:pb-10">

        {/* ===================== HEADER ===================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[24px] font-extrabold tracking-tight text-ink m-0">Kasbon</h1>
            <p className="text-mu mt-1 text-[14px]">Utang pelanggan, mudah ditagih</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-br hover:brightness-110 text-white px-4 py-2.5 rounded-[14px] text-[14px] font-bold transition-all shadow-[0_6px_14px_rgba(30,155,80,0.25)] shrink-0"
          >
            <Plus className="w-4 h-4" /> Kasbon Baru
          </button>
        </div>

        {/* ===================== RINGKASAN (KPI) ===================== */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-ln rounded-[18px] p-4 shadow-sm">
            <span className="text-xs font-bold text-mu uppercase tracking-wider block mb-1">Total piutang</span>
            <p className="text-[22px] font-extrabold text-rd">{formatRupiah(summary.totalPiutang)}</p>
          </div>
          
          <div className="bg-card border border-ln rounded-[18px] p-4 shadow-sm">
            <span className="text-xs font-bold text-mu uppercase tracking-wider block mb-1">Pelanggan</span>
            <p className="text-[22px] font-extrabold text-ink">{summary.jumlahPelanggan}</p>
          </div>

          <div className="bg-card border border-ln rounded-[18px] p-4 shadow-sm">
            <span className="text-xs font-bold text-mu uppercase tracking-wider block mb-1">Lewat tempo</span>
            <p className="text-[22px] font-extrabold text-rd">{summary.jumlahTelat}</p>
          </div>
        </div>

        {/* ===================== FILTER & PENCARIAN ===================== */}
        <div className="bg-card border border-ln rounded-[18px] p-4 shadow-sm mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-[380px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mu w-4 h-4" />
            <input
              type="text"
              placeholder="Cari nama pelanggan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-ln rounded-[14px] text-sm text-ink outline-none focus:border-br transition-colors"
            />
          </div>

          <div className="flex bg-bg border border-ln rounded-[14px] p-1 w-full sm:w-auto">
            <button
              onClick={() => setFilterStatus('belum_lunas')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-[10px] text-xs font-bold transition-all ${filterStatus === 'belum_lunas' ? 'bg-card text-br shadow-sm border border-br/30' : 'text-mu hover:text-ink'}`}
            >
              Belum Lunas
            </button>
            <button
              onClick={() => setFilterStatus('lunas')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-[10px] text-xs font-bold transition-all ${filterStatus === 'lunas' ? 'bg-card text-br shadow-sm border border-br/30' : 'text-mu hover:text-ink'}`}
            >
              Lunas
            </button>
            <button
              onClick={() => setFilterStatus('semua')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-[10px] text-xs font-bold transition-all ${filterStatus === 'semua' ? 'bg-card text-br shadow-sm border border-br/30' : 'text-mu hover:text-ink'}`}
            >
              Semua
            </button>
          </div>
        </div>

        {/* ===================== TABEL DAFTAR KASBON ===================== */}
        {loadingData ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-card border border-ln h-20 rounded-[18px] w-full"></div>
            ))}
          </div>
        ) : displayedDebts.length === 0 ? (
          <div className="bg-card border border-ln rounded-[18px] py-16 flex flex-col items-center justify-center text-center px-4">
            <CheckCircle2 className="h-10 w-10 text-br mb-2 opacity-50" />
            <p className="text-ink font-bold text-sm">Tidak ada catatan kasbon</p>
            <p className="text-mu text-xs mt-1">Belum ada data pelanggan yang cocok dengan filter Anda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Header Tabel */}
            <div className="hidden sm:grid grid-cols-12 px-6 py-2 text-[11px] font-bold text-mu uppercase tracking-wider">
              <div className="col-span-4">Pelanggan</div>
              <div className="col-span-3">Jatuh Tempo</div>
              <div className="col-span-3">Sisa Utang</div>
              <div className="col-span-2 text-right">Aksi</div>
            </div>

            {displayedDebts.map((debt) => {
              const sisaUtang = Number(debt.amount || 0) - Number(debt.paid_amount || 0)
              const overdueDays = getDaysOverdue(debt.due_date)
              const isOverdue = debt.status !== 'paid' && overdueDays !== null && overdueDays > 0
              const waMessage = encodeURIComponent(
                `Halo ${debt.customer_name}, mau ingatkan kasbon di warung sebesar ${formatRupiah(sisaUtang)}${debt.due_date ? ` yang jatuh tempo ${formatDate(debt.due_date)}` : ''}. Terima kasih 🙏`
              )

              return (
                <div
                  key={debt.id}
                  className="bg-card border border-ln rounded-[18px] p-4 sm:px-6 sm:py-4 shadow-sm grid grid-cols-1 sm:grid-cols-12 items-center gap-3 transition-all hover:border-br/50"
                >
                  {/* Kolom Nama */}
                  <div className="sm:col-span-4">
                    <p className="font-bold text-ink text-[15px]">{debt.customer_name}</p>
                    <p className="text-xs text-mu mt-0.5">{debt.customer_phone || '08xx-xxxx-xxxx'}</p>
                  </div>

                  {/* Kolom Jatuh Tempo */}
                  <div className="sm:col-span-3 flex items-center">
                    {isOverdue ? (
                      <span className="text-xs font-bold text-rd flex items-center gap-1 bg-rs px-2.5 py-1 rounded-lg border border-rd/20">
                        <AlertTriangle className="w-3.5 h-3.5" /> Lewat {overdueDays} hari
                      </span>
                    ) : debt.due_date ? (
                      <span className="text-xs font-semibold text-ink">{formatDate(debt.due_date)}</span>
                    ) : (
                      <span className="text-xs text-mu italic">Tanpa tempo</span>
                    )}
                  </div>

                  {/* Kolom Sisa Utang */}
                  <div className="sm:col-span-3">
                    <p className="text-xs text-mu sm:hidden font-medium">Sisa Utang:</p>
                    <p className="font-extrabold text-ink text-[16px]">{formatRupiah(sisaUtang)}</p>
                  </div>

                  {/* Kolom Aksi */}
                  <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-0 border-ln">
                    {debt.customer_phone && (
                      <a
                        href={`https://wa.me/${debt.customer_phone.replace(/\D/g, '')}?text=${waMessage}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-card border border-ln hover:bg-so text-ink rounded-[10px] text-xs font-bold transition-colors"
                      >
                        Ingatkan
                      </a>
                    )}
                    
                    {payingId === debt.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          placeholder="Nominal"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          className="w-24 px-2 py-1.5 bg-bg border border-ln rounded-lg text-xs font-bold outline-none focus:border-br"
                        />
                        <button
                          onClick={() => handlePay(debt.id, Number(payAmount))}
                          disabled={isPaying}
                          className="bg-br text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"
                        >
                          OK
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (debt.status === 'paid') return
                          handlePay(debt.id, sisaUtang)
                        }}
                        disabled={debt.status === 'paid'}
                        className="bg-br hover:brightness-110 text-white px-3.5 py-2 rounded-[10px] text-xs font-bold transition-all shadow-sm disabled:opacity-40"
                      >
                        {debt.status === 'paid' ? 'Lunas' : 'Catat Bayar'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ===================== MODAL KASBON BARU ===================== */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-card border border-ln rounded-[22px] w-full max-w-lg p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-ln">
                <h2 className="text-[18px] font-extrabold text-ink m-0">Kasbon baru</h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-bg border border-ln flex items-center justify-center text-mu hover:text-ink hover:bg-so transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">Nama pelanggan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Bu Rina"
                    {...register('customer_name')}
                    className={`w-full px-4 py-3 bg-card border rounded-[14px] text-sm text-ink outline-none transition-all ${
                      errors.customer_name ? 'border-rd' : 'border-ln focus:border-br'
                    }`}
                  />
                  {errors.customer_name && <p className="text-rd text-xs mt-1 font-medium">{errors.customer_name.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1.5">Jumlah (Rp)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="0"
                      {...register('amount', { valueAsNumber: true })}
                      className={`w-full px-4 py-3 bg-card border rounded-[14px] text-sm text-ink outline-none transition-all ${
                        errors.amount ? 'border-rd' : 'border-ln focus:border-br'
                      }`}
                    />
                    {errors.amount && <p className="text-rd text-xs mt-1 font-medium">{errors.amount.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink mb-1.5">Jatuh tempo</label>
                    <input
                      type="date"
                      {...register('due_date')}
                      className="w-full px-4 py-3 bg-card border border-ln rounded-[14px] text-sm text-ink outline-none focus:border-br cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">Nomor WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="08xxxxxxxxxx"
                    {...register('customer_phone')}
                    className="w-full px-4 py-3 bg-card border border-ln rounded-[14px] text-sm text-ink outline-none focus:border-br"
                  />
                  <p className="text-mu text-[11px] mt-1">Dipakai untuk pengingat</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">Catatan</label>
                  <input
                    type="text"
                    placeholder="Opsional"
                    {...register('notes')}
                    className="w-full px-4 py-3 bg-card border border-ln rounded-[14px] text-sm text-ink outline-none focus:border-br"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full mt-2 bg-br hover:brightness-110 text-white rounded-[14px] py-3.5 text-sm font-bold transition-all disabled:opacity-50 flex justify-center items-center gap-2 shadow-[0_6px_14px_rgba(30,155,80,0.25)]"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isPending ? 'Menyimpan...' : 'Simpan Kasbon'}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardShell>
  )
}