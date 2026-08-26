'use client'

import { useRef } from 'react'
import { Printer, X } from 'lucide-react'

type ReceiptItem = { name: string; qty: number; price: number }

type ReceiptData = {
  storeName: string
  storeAddress?: string
  storePhone?: string
  items: ReceiptItem[]
  total: number
  date: Date
  transactionId: string
  paymentMethod?: 'cash' | 'qris' | 'debit'
  paidAmount?: number
  changeAmount?: number
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Tunai',
  qris: 'QRIS',
  debit: 'Debit',
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(n)
}

export function ReceiptModal({ data, onClose }: { data: ReceiptData; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null)

  function handlePrint() {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 print:hidden-none">
      {/* Overlay - tidak ikut print */}
      <div className="absolute inset-0 bg-ink/40 print:hidden" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm print:shadow-none print:rounded-none print:max-w-none">
        {/* Header modal - tidak ikut print */}
        <div className="flex items-center justify-between p-4 border-b border-lavender print:hidden">
          <h3 className="font-bold text-ink">Struk Transaksi</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-lavender rounded-lg transition-colors">
            <X className="w-4 h-4 text-muted" />
          </button>
        </div>

        {/* ===== Area yang di-print ===== */}
        <div ref={printRef} id="receipt-print-area" className="p-6 font-mono text-xs text-ink">
          <div className="text-center mb-3">
            <p className="font-bold text-sm uppercase">{data.storeName}</p>
            {data.storeAddress && <p>{data.storeAddress}</p>}
            {data.storePhone && <p>{data.storePhone}</p>}
          </div>

          <div className="border-t border-dashed border-ink/40 my-2" />

          <div className="flex justify-between text-[11px]">
            <span>{new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(data.date)}</span>
            <span>{new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(data.date)}</span>
          </div>
          <p className="text-[11px] text-muted">No: {data.transactionId.slice(0, 8).toUpperCase()}</p>

          <div className="border-t border-dashed border-ink/40 my-2" />

          <div className="space-y-1.5">
            {data.items.map((item, idx) => (
              <div key={idx}>
                <p>{item.name}</p>
                <div className="flex justify-between">
                  <span>{item.qty} x {formatRupiah(item.price)}</span>
                  <span>{formatRupiah(item.qty * item.price)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-ink/40 my-2" />

          <div className="flex justify-between font-bold text-sm">
            <span>TOTAL</span>
            <span>Rp {formatRupiah(data.total)}</span>
          </div>

          {data.paymentMethod && (
            <>
              <div className="border-t border-dashed border-ink/40 my-2" />
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Metode Bayar</span>
                  <span className="font-bold">{PAYMENT_LABELS[data.paymentMethod] ?? data.paymentMethod}</span>
                </div>
                {typeof data.paidAmount === 'number' && (
                  <div className="flex justify-between">
                    <span>{data.paymentMethod === 'cash' ? 'Uang Diterima' : 'Dibayar'}</span>
                    <span>Rp {formatRupiah(data.paidAmount)}</span>
                  </div>
                )}
                {data.paymentMethod === 'cash' && typeof data.changeAmount === 'number' && (
                  <div className="flex justify-between font-bold">
                    <span>Kembalian</span>
                    <span>Rp {formatRupiah(data.changeAmount)}</span>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="border-t border-dashed border-ink/40 my-3" />

          <p className="text-center text-[11px]">Terima kasih telah berbelanja</p>
        </div>

        <div className="p-4 print:hidden">
          <button
            onClick={handlePrint}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-xl py-3 text-sm font-bold transition-colors shadow-sm shadow-primary/30"
          >
            <Printer className="w-4 h-4" /> Cetak Struk
          </button>
        </div>
      </div>
    </div>
  )
}