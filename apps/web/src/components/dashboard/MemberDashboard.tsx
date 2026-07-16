import { Bell, CalendarClock, CheckCircle2, ListTodo } from 'lucide-react'
import type { MemberDashboardData } from '@taskflow/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate, relativeTime } from '@/lib/utils'
import { StatTile } from './StatTile'

export function MemberDashboard({ data }: { data: MemberDashboardData }) {
  const openTaskCount = Object.values(data.openTasksByPriority).reduce((sum, n) => sum + n, 0)
  const completedLast30Days = data.completionRate.reduce((sum, d) => sum + d.completed, 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Open tasks" value={openTaskCount} icon={ListTodo} />
        <StatTile label="Due this week" value={data.dueThisWeek.length} icon={CalendarClock} />
        <StatTile label="Completed (30d)" value={completedLast30Days} icon={CheckCircle2} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Open tasks by priority</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(data.openTasksByPriority).map(([priority, count]) => (
              <div key={priority} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{priority}</span>
                <span className="font-medium tabular-nums">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Due this week</CardTitle>
          </CardHeader>
          <CardContent>
            {data.dueThisWeek.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Nothing due in the next 7 days. 🎉</p>
            ) : (
              <ul className="space-y-2">
                {data.dueThisWeek.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">{t.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDate(t.dueDate)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4" /> Recent notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentNotifications.length === 0 ? (
            <EmptyState icon={Bell} title="No notifications yet" className="border-none py-8" />
          ) : (
            <ul className="divide-y divide-border">
              {data.recentNotifications.map((n) => (
                <li key={n.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="truncate">{n.actor?.name ?? 'Someone'} — {n.type.replace('_', ' ').toLowerCase()}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(n.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
