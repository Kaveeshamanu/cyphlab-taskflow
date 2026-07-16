'use client'

import { ShieldAlert } from 'lucide-react'
import type { Role } from '@taskflow/types'
import { useAuthStore } from '@/stores/authStore'
import { EmptyState } from './EmptyState'

// UX-only gate — hides a page's content for the wrong role so the sidebar
// nav config isn't the only thing standing between a non-admin and this
// route. The API independently 403s every request regardless (see
// requireRole in apps/api); this never substitutes for that.
export function RequireRole({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)

  if (!user || !roles.includes(user.role)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Access restricted"
        description="You don't have permission to view this page."
      />
    )
  }

  return <>{children}</>
}
