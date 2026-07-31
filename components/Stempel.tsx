'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

export function useStempel() {
  const [visible, setVisible] = useState(false)
  const [label, setLabel] = useState('Tersimpan')

  function show(text = 'Tersimpan') {
    setLabel(text)
    setVisible(true)
    setTimeout(() => setVisible(false), 2200)
  }

  return { visible, label, show }
}

export function Stempel({ visible, label }: { visible: boolean; label: string }) {
  return (
    <div
      className={`fixed top-6 right-6 z-[100] transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
      }`}
    >
      <div className="flex items-center gap-2.5 bg-white shadow-lg rounded-xl px-4 py-3 border border-borderc">
        <div className="p-1 bg-primary-light rounded-full">
          <CheckCircle2 className="w-4 h-4 text-primary" />
        </div>
        <span className="text-sm font-semibold text-ink">{label}</span>
      </div>
    </div>
  )
}