'use client'

import { useState } from 'react'
import { Activity as ActivityIcon } from 'lucide-react'
import { Role } from '@taskflow/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Pagination } from '@/components/shared/Pagination'
import { RequireRole } from '@/components/shared/RequireRole'
import { SkeletonRows } from '@/components/shared/SkeletonCard'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useActivity } from '@/hooks/useActivity'
import { formatDateTime } from '@/lib/utils'

const ENTITY_TYPES = ['task', 'project', 'user', 'comment', 'attachment']

function ActivityPageContent() {
  const [entityType, setEntityType] = useState<string>('all')
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, refetch } = useActivity({
    page,
    limit: 25,
    entityType: entityType === 'all' ? undefined : entityType,
  })
  const logs = data?.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader title="Activity log" description="A full audit trail of every create, update, and delete." />

      <Select
        value={entityType}
        onValueChange={(v) => {
          setEntityType(v)
          setPage(1)
        }}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Entity type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All entity types</SelectItem>
          {ENTITY_TYPES.map((t) => (
            <SelectItem key={t} value={t}>
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading && <SkeletonRows rows={10} cols={4} />}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !isError && logs.length === 0 && (
        <EmptyState icon={ActivityIcon} title="No activity yet" description="Nothing matches this filter." />
      )}
      {!isLoading && !isError && logs.length > 0 && (
        <>
          <ol className="space-y-3 border-l border-border pl-4">
            {logs.map((log) => (
              <li key={log.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{log.actor?.name ?? 'System'}</span>
                  <Badge variant="outline">{log.action}</Badge>
                  <span className="text-muted-foreground">{log.entityType}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</span>
                </div>
              </li>
            ))}
          </ol>
          {data && <Pagination meta={data.meta} onPageChange={setPage} />}
        </>
      )}
    </div>
  )
}

export default function ActivityPage() {
  return (
    <RequireRole roles={[Role.ADMIN]}>
      <ActivityPageContent />
    </RequireRole>
  )
}
