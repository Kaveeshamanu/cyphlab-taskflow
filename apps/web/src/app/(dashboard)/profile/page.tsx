'use client'

import { Mail, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { useAuth } from '@/hooks/useAuth'
import { initials } from '@/lib/utils'

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const { forgotPassword } = useAuth()

  if (!user) return null

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Profile & settings" description="Your account details." />

      <Card>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
          <Avatar className="h-14 w-14">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
            <AvatarFallback className="text-lg">{initials(user.name)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{user.name}</CardTitle>
            <CardDescription className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {user.email}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-sm">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Role</span>
          <Badge variant="secondary">{user.role.replace('_', ' ')}</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Password</CardTitle>
          <CardDescription>
            We&apos;ll email a reset link to <span className="font-medium text-foreground">{user.email}</span>.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            variant="outline"
            onClick={() => forgotPassword.mutate({ email: user.email })}
            loading={forgotPassword.isPending}
          >
            Send password reset email
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
