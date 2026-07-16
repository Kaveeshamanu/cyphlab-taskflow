'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Priority, TaskStatus, type AttachmentDto, type TaskDto } from '@taskflow/types'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/shared/ErrorState'
import { TaskComments } from './TaskComments'
import { TaskAttachments } from './TaskAttachments'
import { useTask, useUpdateTask } from '@/hooks/useTasks'
import { useProject } from '@/hooks/useProjects'
import { useAuthStore } from '@/stores/authStore'
import { api, getErrorMessage } from '@/lib/api'

interface TaskDrawerProps {
  taskId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TaskDrawer({ taskId, open, onOpenChange }: TaskDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        {taskId && <TaskDrawerContent key={taskId} taskId={taskId} />}
      </SheetContent>
    </Sheet>
  )
}

function TaskDrawerContent({ taskId }: { taskId: string }) {
  const { data: task, isLoading, isError, refetch } = useTask(taskId)

  if (isLoading) {
    return (
      <div className="space-y-4 pt-6">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }
  if (isError || !task) {
    return <ErrorState onRetry={() => refetch()} className="mt-6" />
  }
  return <TaskDrawerBody task={task} />
}

function TaskDrawerBody({ task }: { task: TaskDto }) {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const { data: project } = useProject(task.projectId)
  const updateTask = useUpdateTask(task.id)

  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')

  const canManage = user?.role === 'ADMIN' || project?.managerId === user?.id
  const canChangeStatus = canManage || task.assigneeId === user?.id

  const moveStatus = useMutation({
    mutationFn: (status: TaskStatus) => api.patch(`/tasks/${task.id}/move`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Status updated')
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Could not update status')),
  })

  const assigneeOptions = [
    ...(project?.manager ? [{ id: project.manager.id, name: `${project.manager.name} (Manager)` }] : []),
    ...(project?.members ?? []),
  ]

  function canDeleteAttachment(attachment: AttachmentDto): boolean {
    return canManage || attachment.uploaderId === user?.id
  }

  return (
    <div className="flex h-full flex-col">
      <SheetHeader>
        {canManage ? (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title !== task.title && title.trim() && updateTask.mutate({ title })}
            className="border-none px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
          />
        ) : (
          <SheetTitle>{task.title}</SheetTitle>
        )}
      </SheetHeader>

      <div className="flex-1 space-y-5 overflow-y-auto py-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={task.status}
              disabled={!canChangeStatus}
              onValueChange={(v) => moveStatus.mutate(v as TaskStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(TaskStatus).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select
              value={task.priority}
              disabled={!canManage}
              onValueChange={(v) => updateTask.mutate({ priority: v as Priority })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(Priority).map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dueDate">Due date</Label>
            <Input
              id="dueDate"
              type="date"
              disabled={!canManage}
              defaultValue={task.dueDate ? task.dueDate.slice(0, 10) : ''}
              onBlur={(e) => updateTask.mutate({ dueDate: e.target.value ? new Date(e.target.value) : null })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Assignee</Label>
            <Select
              value={task.assigneeId ?? 'unassigned'}
              disabled={!canManage}
              onValueChange={(v) => updateTask.mutate({ assigneeId: v === 'unassigned' ? null : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {assigneeOptions.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {task.tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          {canManage ? (
            <Textarea
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => description !== (task.description ?? '') && updateTask.mutate({ description })}
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {task.description || 'No description.'}
            </p>
          )}
        </div>

        <Separator />
        <TaskAttachments taskId={task.id} canDelete={canDeleteAttachment} />
        <Separator />
        <TaskComments taskId={task.id} members={assigneeOptions} />
      </div>
    </div>
  )
}
