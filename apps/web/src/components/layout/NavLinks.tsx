'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FolderKanban,
  ListChecks,
  Users,
  History,
  type LucideIcon,
} from 'lucide-react'
import { Role } from '@taskflow/types'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  roles: Role[]
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [Role.ADMIN, Role.PROJECT_MANAGER, Role.TEAM_MEMBER] },
  { href: '/projects', label: 'Projects', icon: FolderKanban, roles: [Role.ADMIN, Role.PROJECT_MANAGER, Role.TEAM_MEMBER] },
  { href: '/tasks', label: 'Tasks', icon: ListChecks, roles: [Role.ADMIN, Role.PROJECT_MANAGER, Role.TEAM_MEMBER] },
  { href: '/users', label: 'Users', icon: Users, roles: [Role.ADMIN] },
  { href: '/activity', label: 'Activity', icon: History, roles: [Role.ADMIN] },
]

interface NavLinksProps {
  role: Role
  onNavigate?: () => void
}

export function NavLinks({ role, onNavigate }: NavLinksProps) {
  const pathname = usePathname()
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role))

  return (
    <nav className="flex flex-col gap-1" aria-label="Primary">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
