'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { KanbanSquare, Plus } from 'lucide-react'
import { Role } from '@taskflow/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { ErrorState } from '@/components/shared/ErrorState'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { TaskDrawer } from '@/components/task/TaskDrawer'
import { CreateTaskDialog } from '@/components/task/CreateTaskDialog'
import { tasksQueryKey, useTasks } from '@/hooks/useTasks'
import { useAuthStore } from '@/stores/authStore'
import { useProject } from '@/hooks/useProjects'

export default function ProjectKanbanPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const { data: project } = useProject(params.id)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const query = { projectId: params.id, limit: 100, sort: 'position' as const, order: 'asc' as const }
  const { data, isLoading, isError, refetch } = useTasks(query)
  const tasks = data?.data ?? []

  const canCreate = user?.role === Role.ADMIN || (project && project.managerId === user?.id)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kanban board"
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

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      )}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !isError && tasks.length === 0 && (
        <EmptyState
          icon={KanbanSquare}
          title="No tasks yet"
          description="Create the first task to start planning this project."
        />
      )}
      {!isLoading && !isError && tasks.length > 0 && (
        <KanbanBoard tasks={tasks} queryKey={tasksQueryKey(query)} onCardClick={(task) => setSelectedTaskId(task.id)} />
      )}

      <TaskDrawer taskId={selectedTaskId} open={!!selectedTaskId} onOpenChange={(open) => !open && setSelectedTaskId(null)} />
    </div>
  )
}
