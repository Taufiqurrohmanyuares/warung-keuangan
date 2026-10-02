import Sidebar from '@/components/Sidebar'

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-bg relative">
      <Sidebar />
      
      {/* Di HP margin-left = 0, di Tablet ml-20, di Desktop ml-[248px] */}
      <div className="flex-1 min-w-0 flex flex-col min-h-[100dvh] md:ml-20 lg:ml-[248px]">
        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-10" id="pg">
          <div className="max-w-[1180px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}