import Link from 'next/link'
import { CheckSquare } from 'lucide-react'
import type { Role } from '@taskflow/types'
import { NavLinks } from './NavLinks'

export function Sidebar({ role }: { role: Role }) {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-card px-4 py-5 lg:flex">
      <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-2 text-lg font-semibold tracking-tight">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <CheckSquare className="h-4.5 w-4.5" />
        </span>
        TaskFlow
      </Link>
      <NavLinks role={role} />
    </aside>
  )
}
