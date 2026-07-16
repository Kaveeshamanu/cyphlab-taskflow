'use client'

import { Role } from '@taskflow/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { ErrorState } from '@/components/shared/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { AdminDashboard } from '@/components/dashboard/AdminDashboard'
import { PMDashboard } from '@/components/dashboard/PMDashboard'
import { MemberDashboard } from '@/components/dashboard/MemberDashboard'
import { useDashboard } from '@/hooks/useDashboard'
import { useAuthStore } from '@/stores/authStore'

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 p-5">
              <Skeleton className="h-10 w-10 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-6 w-1/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-2/3" />
        </CardContent>
      </Card>
    </div>
  )
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const { data, isLoading, isError, refetch } = useDashboard()

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome back${user ? `, ${user.name.split(' ')[0]}` : ''}`} />

      {isLoading && <DashboardSkeleton />}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !isError && data && (
        <>
          {data.role === Role.ADMIN && <AdminDashboard data={data} />}
          {data.role === Role.PROJECT_MANAGER && <PMDashboard data={data} />}
          {data.role === Role.TEAM_MEMBER && <MemberDashboard data={data} />}
        </>
      )}
    </div>
  )
}
