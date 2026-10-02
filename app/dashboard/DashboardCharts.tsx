'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type ChartPoint = { date: string; income: number; expense: number }

const rupiah = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v)

const compact = (v: number) =>
  v >= 1_000_000 ? `${+(v / 1_000_000).toFixed(1)}jt` : v >= 1000 ? `${Math.round(v / 1000)}rb` : String(v)

export default function DashboardCharts({ data }: { data: ChartPoint[] }) {
  const hasValue = data.some((d) => d.income > 0 || d.expense > 0)

  if (data.length === 0 || !hasValue) {
    return (
      <div className="flex flex-col items-center justify-center h-[260px] bg-bg rounded-xl border border-dashed border-ln">
        <p className="text-sm text-mu">Belum ada transaksi untuk ditampilkan</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1E9B50" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#1E9B50" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#DC2626" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E1EBE4" />

            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: '#64806F' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(d: string) => String(Number(d.slice(8)))}
              minTickGap={14}
              dy={8}
            />
            <YAxis
              width={44}
              tick={{ fontSize: 12, fill: '#64806F' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => compact(Number(v))}
            />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(15,76,58,0.15)' }}
              labelFormatter={(d) =>
                new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long' }).format(new Date(String(d)))
              }
              formatter={(v) => rupiah(Number(v))}
            />

            <Area type="monotone" dataKey="income" name="Pemasukan" stroke="#1E9B50" strokeWidth={2} fill="url(#colorIncome)" />
            <Area type="monotone" dataKey="expense" name="Pengeluaran" stroke="#DC2626" strokeWidth={2} fill="url(#colorExpense)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-4 text-xs text-mu mt-3">
        <span className="flex items-center gap-1.5"><b className="w-2.5 h-2.5 rounded-sm bg-br inline-block" />Pemasukan</span>
        <span className="flex items-center gap-1.5"><b className="w-2.5 h-2.5 rounded-sm bg-rd inline-block" />Pengeluaran</span>
        <span className="ml-auto">Tanggal</span>
      </div>
    </div>
  )
}