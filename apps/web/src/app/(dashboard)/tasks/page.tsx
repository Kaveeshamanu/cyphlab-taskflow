'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ListChecks } from 'lucide-react'
import { Priority, TaskStatus } from '@taskflow/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Pagination } from '@/components/shared/Pagination'
import { TaskFilters } from '@/components/task/TaskFilters'
import { TaskTable } from '@/components/task/TaskTable'
import { TaskDrawer } from '@/components/task/TaskDrawer'
import { useTasks } from '@/hooks/useTasks'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

export default function TasksPage() {
  const searchParams = useSearchParams()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<TaskStatus | 'all'>('all')
  const [priority, setPriority] = useState<Priority | 'all'>('all')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<{ key: string; order: 'asc' | 'desc' }>({ key: 'dueDate', order: 'asc' })
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(searchParams.get('task'))
  const debouncedSearch = useDebouncedValue(search, 300)

  const query = {
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    status: status === 'all' ? undefined : status,
    priority: priority === 'all' ? undefined : priority,
    sort: sort.key as 'dueDate' | 'priority' | 'title' | 'position' | 'createdAt',
    order: sort.order,
  }
  const { data, isLoading, isError, refetch } = useTasks(query)
  const tasks = data?.data ?? []

  function handleSortChange(key: string) {
    setSort((prev) => (prev.key === key ? { key, order: prev.order === 'asc' ? 'desc' : 'asc' } : { key, order: 'asc' }))
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Tasks" description="Every task across the projects you have access to." />

      <TaskFilters
        search={search}
        onSearchChange={(v) => {
          setSearch(v)
          setPage(1)
        }}
        status={status}
        onStatusChange={(v) => {
          setStatus(v)
          setPage(1)
        }}
        priority={priority}
        onPriorityChange={(v) => {
          setPriority(v)
          setPage(1)
        }}
      />

      {isError && <ErrorState onRetry={() => refetch()} />}
      {!isError && !isLoading && tasks.length === 0 && (
        <EmptyState
          icon={ListChecks}
          title="No tasks found"
          description="Try adjusting your search or filters."
        />
      )}
      {!isError && (isLoading || tasks.length > 0) && (
        <>
          <TaskTable
            tasks={tasks}
            sort={sort}
            onSortChange={handleSortChange}
            onRowClick={(task) => setSelectedTaskId(task.id)}
            isLoading={isLoading}
          />
          {data && <Pagination meta={data.meta} onPageChange={setPage} />}
        </>
      )}

      <TaskDrawer
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onOpenChange={(open) => !open && setSelectedTaskId(null)}
      />
    </div>
  )
}
