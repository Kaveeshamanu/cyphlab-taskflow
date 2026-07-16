import Link from 'next/link'
import { AlertTriangle, CalendarClock, FolderKanban, Users } from 'lucide-react'
import type { PMDashboardData } from '@taskflow/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProjectStatusBadge } from '@/components/shared/StatusBadges'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatDate } from '@/lib/utils'
import { StatTile } from './StatTile'

export function PMDashboard({ data }: { data: PMDashboardData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="My projects" value={data.projectHealth.length} icon={FolderKanban} />
        <StatTile label="Overdue tasks" value={data.overdueCount} icon={AlertTriangle} />
        <StatTile label="Team members" value={data.teamWorkload.length} icon={Users} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project health</CardTitle>
        </CardHeader>
        <CardContent>
          {data.projectHealth.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description="Create a project to see its health here."
              className="border-none py-8"
            />
          ) : (
            <ul className="divide-y divide-border">
              {data.projectHealth.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/projects/${p.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
                    {p.name}
                  </Link>
                  <ProjectStatusBadge status={p.status} />
                  <span className="w-20 shrink-0 text-right text-sm text-muted-foreground">{p.taskCount} tasks</span>
                  <span className="w-24 shrink-0 text-right text-sm text-destructive">
                    {p.overdueCount > 0 ? `${p.overdueCount} overdue` : '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tasks by status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(data.tasksByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{status.replace('_', ' ')}</span>
                <span className="font-medium tabular-nums">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> Upcoming deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcomingDeadlines.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Nothing due in the next 7 days.</p>
            ) : (
              <ul className="space-y-2">
                {data.upcomingDeadlines.map((t) => (
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
          <CardTitle>Team workload</CardTitle>
        </CardHeader>
        <CardContent>
          {data.teamWorkload.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No tasks assigned across your team yet.</p>
          ) : (
            <ul className="space-y-2">
              {data.teamWorkload.map((w) => (
                <li key={w.userId} className="flex items-center justify-between text-sm">
                  <span>{w.name}</span>
                  <span className="font-medium tabular-nums">{w.taskCount} tasks</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
