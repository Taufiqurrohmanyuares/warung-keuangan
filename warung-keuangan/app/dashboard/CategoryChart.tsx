'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

type CategoryData = { name: string; value: number }

// Palet warna modern untuk grafik
const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

export default function CategoryChart({ data }: { data: CategoryData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[320px] bg-gray-50 rounded-xl border border-dashed border-gray-200">
        <p className="text-sm text-gray-500">Belum ada data pengeluaran untuk dianalisis</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={80} // Membuat bagian tengah kosong (Donut)
          outerRadius={110}
          paddingAngle={4} // Jarak antar potongan
          dataKey="value"
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v)}
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
        />
        <Legend 
          verticalAlign="bottom" 
          height={36} 
          iconType="circle" 
          wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}