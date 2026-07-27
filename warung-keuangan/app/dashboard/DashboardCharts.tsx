'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

type ChartPoint = { date: string; income: number; expense: number }

export default function DashboardCharts({ data }: { data: ChartPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[320px] bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <p className="text-sm text-gray-500">Belum ada transaksi untuk ditampilkan</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
          </linearGradient>
        </defs>
        
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
        
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 12, fill: '#6b7280' }} 
          tickLine={false}
          axisLine={false}
          tickFormatter={(d) => d.slice(5)} 
          dy={10}
        />
        
        <YAxis 
          tick={{ fontSize: 12, fill: '#6b7280' }} 
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v / 1000}k`} 
        />
        
        <Tooltip 
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          formatter={(v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v)} 
        />
        
        <Area 
          type="monotone" 
          dataKey="income" 
          name="Pemasukan" 
          stroke="#16a34a" 
          strokeWidth={2}
          fillOpacity={1} 
          fill="url(#colorIncome)" 
        />
        <Area 
          type="monotone" 
          dataKey="expense" 
          name="Pengeluaran" 
          stroke="#dc2626" 
          strokeWidth={2}
          fillOpacity={1} 
          fill="url(#colorExpense)" 
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}