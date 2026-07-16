'use client'

import { QueryProvider } from './QueryProvider'
import { ThemeProvider } from './ThemeProvider'
import { SessionProvider } from './SessionProvider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <TooltipProvider delayDuration={200}>
          <SessionProvider>{children}</SessionProvider>
          <Toaster richColors position="top-right" closeButton />
        </TooltipProvider>
      </ThemeProvider>
    </QueryProvider>
  )
}
