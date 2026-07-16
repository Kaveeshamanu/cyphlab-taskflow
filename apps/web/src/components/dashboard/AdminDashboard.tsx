import Link from 'next/link'
import { Users, FolderKanban, ListChecks, Activity as ActivityIcon } from 'lucide-react'
import type { AdminDashboardData } from '@taskflow/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { relativeTime } from '@/lib/utils'
import { StatTile } from './StatTile'

export function AdminDashboard({ data }: { data: AdminDashboardData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Total users" value={data.systemStats.totalUsers} icon={Users} />
        <StatTile label="Total projects" value={data.systemStats.totalProjects} icon={FolderKanban} />
        <StatTile label="Total tasks" value={data.systemStats.totalTasks} icon={ListChecks} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Users by role</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(data.usersByRole).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{role.replace('_', ' ')}</span>
                <span className="font-medium tabular-nums">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projects by status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(data.projectsByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{status.replace('_', ' ')}</span>
                <span className="font-medium tabular-nums">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentActivity.length === 0 ? (
            <EmptyState icon={ActivityIcon} title="No activity yet" className="border-none py-8" />
          ) : (
            <ul className="space-y-3">
              {data.recentActivity.map((log) => (
                <li key={log.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">
                    <span className="font-medium">{log.actor?.name ?? 'Someone'}</span>{' '}
                    <Badge variant="outline" className="ml-1 align-middle">
                      {log.action}
                    </Badge>{' '}
                    <span className="text-muted-foreground">{log.entityType}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(log.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/activity" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            View full activity log →
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
