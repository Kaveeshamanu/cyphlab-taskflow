import Link from 'next/link'
import { CheckSquare } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        <Link href="/" className="mb-8 flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <CheckSquare className="h-4.5 w-4.5" />
          </span>
          TaskFlow
        </Link>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
