'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ListChecks, Plus } from 'lucide-react'
import { Priority, Role, TaskStatus } from '@taskflow/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Pagination } from '@/components/shared/Pagination'
import { Button } from '@/components/ui/button'
import { TaskFilters } from '@/components/task/TaskFilters'
import { TaskTable } from '@/components/task/TaskTable'
import { TaskDrawer } from '@/components/task/TaskDrawer'
import { CreateTaskDialog } from '@/components/task/CreateTaskDialog'
import { useTasks } from '@/hooks/useTasks'
import { useProject } from '@/hooks/useProjects'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useAuthStore } from '@/stores/authStore'

export default function ProjectTasksPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const { data: project } = useProject(params.id)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<TaskStatus | 'all'>('all')
  const [priority, setPriority] = useState<Priority | 'all'>('all')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<{ key: string; order: 'asc' | 'desc' }>({ key: 'dueDate', order: 'asc' })
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const debouncedSearch = useDebouncedValue(search, 300)

  const query = {
    projectId: params.id,
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
  const canCreate = user?.role === Role.ADMIN || (project && project.managerId === user?.id)

  function handleSortChange(key: string) {
    setSort((prev) => (prev.key === key ? { key, order: prev.order === 'asc' ? 'desc' : 'asc' } : { key, order: 'asc' }))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description={project?.name}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => router.push(`/projects/${params.id}`)}>
              Back to project
            </Button>
            {canCreate && (
              <CreateTaskDialog
                projectId={params.id}
                trigger={
                  <Button size="sm">
                    <Plus className="h-4 w-4" />
                    New task
                  </Button>
                }
              />
            )}
          </>
        }
      />

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
        <EmptyState icon={ListChecks} title="No tasks found" description="Try adjusting your filters." />
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
