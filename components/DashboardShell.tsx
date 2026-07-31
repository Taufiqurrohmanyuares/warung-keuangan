import Sidebar from '@/components/Sidebar'

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-lavender">
      <Sidebar />
      <main className="lg:pl-64 pb-16">
        {children}
      </main>
    </div>
  )
}