'use client'

import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createTaskSchema, Priority, type CreateTaskInput } from '@taskflow/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useCreateTask } from '@/hooks/useTasks'
import { useProject } from '@/hooks/useProjects'

interface CreateTaskDialogProps {
  projectId: string
  trigger: ReactNode
}

export function CreateTaskDialog({ projectId, trigger }: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false)
  const { data: project } = useProject(open ? projectId : undefined)
  const createTask = useCreateTask()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { projectId, priority: Priority.MEDIUM },
  })

  const assigneeOptions = [
    ...(project?.manager ? [{ id: project.manager.id, name: `${project.manager.name} (Manager)` }] : []),
    ...(project?.members ?? []),
  ]

  function onSubmit(data: CreateTaskInput) {
    createTask.mutate(
      { ...data, dueDate: data.dueDate || undefined },
      {
        onSuccess: () => {
          setOpen(false)
          reset({ projectId, priority: Priority.MEDIUM })
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a task</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" aria-invalid={!!errors.title} {...register('title')} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...register('description')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={watch('priority')} onValueChange={(v) => setValue('priority', v as Priority)}>
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
              <Input id="dueDate" type="date" {...register('dueDate')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Assignee</Label>
            <Select
              value={watch('assigneeId') ?? 'unassigned'}
              onValueChange={(v) => setValue('assigneeId', v === 'unassigned' ? null : v)}
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
            {errors.assigneeId && <p className="text-xs text-destructive">{errors.assigneeId.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" loading={createTask.isPending}>
              Create task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
