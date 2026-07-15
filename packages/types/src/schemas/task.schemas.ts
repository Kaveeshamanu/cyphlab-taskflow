import { z } from 'zod'
import { Priority, TaskStatus } from '../types/enums'

export const createTaskSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(200),
  description: z.string().max(5000).optional(),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  dueDate: z.coerce.date().optional(),
  projectId: z.string().cuid(),
  assigneeId: z.string().cuid().nullable().optional(),
  parentTaskId: z.string().cuid().nullable().optional(),
  tagIds: z.array(z.string().cuid()).optional(),
})

export const updateTaskSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  priority: z.nativeEnum(Priority).optional(),
  dueDate: z.coerce.date().nullable().optional(),
  assigneeId: z.string().cuid().nullable().optional(),
  parentTaskId: z.string().cuid().nullable().optional(),
  tagIds: z.array(z.string().cuid()).optional(),
})

// Single atomic endpoint for the Kanban drag interaction — see
// PATCH /tasks/:id/move in the API. Both fields are optional (within-column
// reorder sends only position; a column change sends both), but at least one
// must be present or the request is a no-op.
export const moveTaskSchema = z
  .object({
    status: z.nativeEnum(TaskStatus).optional(),
    position: z.number().finite().optional(),
  })
  .refine((data) => data.status !== undefined || data.position !== undefined, {
    message: 'At least one of status or position is required',
  })

export const listTasksQuerySchema = z.object({
  projectId: z.string().cuid().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  assigneeId: z.string().cuid().optional(),
  tag: z.string().optional(),
  dueBefore: z.coerce.date().optional(),
  dueAfter: z.coerce.date().optional(),
  search: z.string().trim().min(1).optional(),
  sort: z.enum(['createdAt', 'dueDate', 'priority', 'position', 'title']).default('position'),
  order: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type MoveTaskInput = z.infer<typeof moveTaskSchema>
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>
