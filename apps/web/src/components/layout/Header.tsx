import type { AuthUser } from '@taskflow/types'
import { MobileNav } from './MobileNav'
import { ThemeToggle } from './ThemeToggle'
import { NotificationBell } from './NotificationBell'
import { UserMenu } from './UserMenu'
import { CommandPalette } from '@/components/command/CommandPalette'

export function Header({ user }: { user: AuthUser }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
      <MobileNav role={user.role} />
      <div className="flex-1 max-w-md">
        <CommandPalette />
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <NotificationBell />
        <UserMenu user={user} />
      </div>
    </header>
  )
}
