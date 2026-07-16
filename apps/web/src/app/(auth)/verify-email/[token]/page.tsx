'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { api, getErrorMessage } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function VerifyEmailPage() {
  const params = useParams<{ token: string }>()
  const { isLoading, isError, error } = useQuery({
    queryKey: ['verify-email', params.token],
    queryFn: () => api.get(`/auth/verify-email/${params.token}`),
    retry: false,
  })

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <CardTitle>Email verification</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 text-center">
        {isLoading && (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
            <CardDescription>Verifying your email…</CardDescription>
          </>
        )}
        {!isLoading && !isError && (
          <>
            <CheckCircle2 className="h-8 w-8 text-success" aria-hidden="true" />
            <CardDescription>Your email is verified. You can now log in.</CardDescription>
            <Button asChild className="w-full">
              <Link href="/login">Go to login</Link>
            </Button>
          </>
        )}
        {!isLoading && isError && (
          <>
            <XCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
            <CardDescription>
              {getErrorMessage(error, 'This verification link is invalid or has expired.')}
            </CardDescription>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Back to login</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
