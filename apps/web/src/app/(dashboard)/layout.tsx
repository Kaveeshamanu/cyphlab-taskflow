'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { useAuthStore } from '@/stores/authStore'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const router = useRouter()

  // Defense in depth: middleware's redirect is based on a lightweight
  // client-set cookie, not the real (cross-origin, httpOnly) refresh token —
  // if session hydration ended up empty, bounce to login rather than render
  // a shell with no user.
  useEffect(() => {
    if (!user) router.replace('/login')
  }, [user, router])

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Sidebar role={user.role} />
      <div className="flex min-h-screen flex-col lg:pl-64">
        <Header user={user} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
