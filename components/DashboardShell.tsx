import Sidebar from '@/components/Sidebar'

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full h-[100dvh] bg-bg overflow-hidden relative">
      <Sidebar />
      
      {/* PERBAIKAN: Ditambahkan margin-left (md:ml-20 lg:ml-[248px]) untuk mengimbangi lebar Sidebar */}
      <div className="flex-1 min-w-0 flex flex-col h-full relative md:ml-20 lg:ml-[248px]">
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-10 scroll-smooth" id="pg">
          <div className="max-w-[1180px] mx-auto w-full h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}