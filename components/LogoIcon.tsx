/**
 * Komponen Logo universal untuk menampilkan gambar logo secara utuh
 */
export default function LogoIcon({ className = 'w-9' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center shrink-0 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo3.png"
        alt="Logo WarungKeuangan"
        className="w-full h-auto object-contain"
      />
    </span>
  )
}