'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckSquare, Menu } from 'lucide-react'
import type { Role } from '@taskflow/types'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { NavLinks } from './NavLinks'

export function MobileNav({ role }: { role: Role }) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle asChild>
            <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <CheckSquare className="h-4.5 w-4.5" />
              </span>
              TaskFlow
            </Link>
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <NavLinks role={role} onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
