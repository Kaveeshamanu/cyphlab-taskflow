'use client'

import { useEffect } from 'react'
import { AlertOctagon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertOctagon className="h-6 w-6 text-destructive" />
      </div>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">An unexpected error occurred. You can try again.</p>
      </div>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  )
}
