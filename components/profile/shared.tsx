'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export function SubPageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-ink tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
    </div>
  )
}

export function SectionCard({
  children, className = '',
}: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm p-6 sm:p-8 space-y-5 ${className}`}>
      {children}
    </div>
  )
}

export function Field({
  label, icon, ...props
}: { label: string; icon?: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">{label}</label>
      <div className="relative">
        {icon && <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">{icon}</div>}
        <input
          {...props}
          className={`w-full ${icon ? 'pl-10' : 'pl-4'} pr-4 py-3 bg-lavender/50 border border-transparent rounded-xl text-sm font-medium text-ink outline-none focus:border-primary focus:bg-white transition-colors`}
        />
      </div>
    </div>
  )
}

export function TextAreaField({
  label, icon, ...props
}: { label: string; icon?: React.ReactNode } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5">{label}</label>
      <textarea
        {...props}
        rows={3}
        className="w-full px-4 py-3 bg-lavender/50 border border-transparent rounded-xl text-sm font-medium text-ink outline-none focus:border-primary focus:bg-white transition-colors resize-none"
      />
    </div>
  )
}

export function ToggleRow({
  label, description, icon, checked, onChange,
}: { label: string; description?: string; icon: React.ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary-light text-primary rounded-lg mt-0.5">{icon}</div>
        <div>
          <p className="text-sm font-semibold text-ink">{label}</p>
          {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`shrink-0 w-11 h-6 rounded-full transition-colors relative ${checked ? 'bg-primary' : 'bg-borderc'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}

export function ActionButton({
  icon, label, onClick, variant = 'default',
}: { icon: React.ReactNode; label: string; onClick?: () => void; variant?: 'default' | 'danger' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
        variant === 'danger'
          ? 'bg-red-50 text-red-600 hover:bg-red-100'
          : 'bg-lavender/60 text-ink hover:bg-lavender'
      }`}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      <ChevronRight className="w-4 h-4 opacity-40" />
    </button>
  )
}

export function MenuListItem({
  icon, iconBg, title, description, href, onClick,
}: { icon: React.ReactNode; iconBg: string; title: string; description: string; href?: string; onClick?: () => void }) {
  const content = (
    <div className="flex items-center gap-4 px-4 py-4 hover:bg-lavender/50 active:bg-lavender transition-colors rounded-xl group cursor-pointer">
      <div className={`p-2.5 rounded-xl ${iconBg} shrink-0`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-ink">{title}</p>
        <p className="text-xs text-muted truncate">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-borderc group-hover:text-muted group-hover:translate-x-0.5 transition-all shrink-0" />
    </div>
  )

  if (href) return <Link href={href}>{content}</Link>
  return <div onClick={onClick}>{content}</div>
}

export function SettingsLayout({
  title, subtitle, tip, tipTitle, tipIcon, children, footer,
}: {
  title: string
  subtitle?: string
  tip?: React.ReactNode
  tipTitle?: string
  tipIcon?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full">
      <SubPageHeader title={title} subtitle={subtitle} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
          {children}
          {footer && <div className="pt-4">{footer}</div>}
        </div>

        {tip && (
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-primary-light rounded-2xl p-6">
              {tipTitle && (
                <div className="flex items-center gap-3 mb-3 text-primary font-bold">
                  {tipIcon}
                  <span>{tipTitle}</span>
                </div>
              )}
              <p className="text-sm text-ink/70 leading-relaxed">{tip}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function Rupiah({ amount, className = '' }: { amount: number; className?: string }) {
  return (
    <span className={className}>
      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)}
    </span>
  )
}