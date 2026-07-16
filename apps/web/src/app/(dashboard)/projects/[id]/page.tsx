'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { KanbanSquare, ListChecks, Trash2, X } from 'lucide-react'
import { Role } from '@taskflow/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ProjectStatusBadge } from '@/components/shared/StatusBadges'
import { ErrorState } from '@/components/shared/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { EditProjectDialog } from '@/components/project/EditProjectDialog'
import { AddMemberDialog } from '@/components/project/AddMemberDialog'
import { useDeleteProject, useProject, useRemoveProjectMember } from '@/hooks/useProjects'
import { useAuthStore } from '@/stores/authStore'
import { initials } from '@/lib/utils'

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const { data: project, isLoading, isError, refetch } = useProject(params.id)
  const deleteProject = useDeleteProject()
  const removeMember = useRemoveProjectMember(params.id)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (isError || !project) {
    return <ErrorState onRetry={() => refetch()} />
  }

  const canManage = user?.role === Role.ADMIN || project.managerId === user?.id

  function handleDelete() {
    if (!window.confirm(`Delete "${project!.name}"? This can be restored later by an admin.`)) return
    deleteProject.mutate(project!.id, { onSuccess: () => router.push('/projects') })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          {project.description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{project.description}</p>}
          {project.manager && (
            <p className="mt-2 text-xs text-muted-foreground">
              Managed by <span className="font-medium text-foreground">{project.manager.name}</span>
            </p>
          )}
        </div>
        {canManage && (
          <div className="flex shrink-0 items-center gap-2">
            <EditProjectDialog project={project} />
            <Button variant="outline" size="sm" onClick={handleDelete} loading={deleteProject.isPending}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href={`/projects/${project.id}/kanban`}>
          <Card className="h-full transition-colors hover:border-primary/50 hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <KanbanSquare className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Kanban board</p>
                <p className="text-sm text-muted-foreground">Drag tasks between statuses</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/projects/${project.id}/tasks`}>
          <Card className="h-full transition-colors hover:border-primary/50 hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <ListChecks className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Task list</p>
                <p className="text-sm text-muted-foreground">Sort, filter, and search tasks</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Members</CardTitle>
          {canManage && (
            <AddMemberDialog projectId={project.id} existingMemberIds={(project.members ?? []).map((m) => m.id)} />
          )}
        </CardHeader>
        <CardContent>
          {!project.members || project.members.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No members yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {project.members.map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs">{initials(member.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{member.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      aria-label={`Remove ${member.name}`}
                      onClick={() => removeMember.mutate(member.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
