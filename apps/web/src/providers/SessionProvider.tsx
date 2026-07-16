'use client'

import { Loader2 } from 'lucide-react'
import { useSessionHydration } from '@/hooks/useAuth'

// Gates first paint behind the silent-refresh hydration call so protected
// pages never flash empty/unauthenticated content while it's in flight.
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { isLoading } = useSessionHydration()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    )
  }

  return <>{children}</>
}
