import { Role, TaskStatus } from '@taskflow/types'
import type { CreateTaskInput, ListTasksQuery, MoveTaskInput, TaskDto, UpdateTaskInput } from '@taskflow/types'
import { prisma, prismaUnfiltered } from '../../db/client'
import { AppError } from '../../utils/envelope'
import { buildMeta, toSkipTake } from '../../utils/pagination'
import { logActivity } from '../../utils/activityLog'
import { clientOrigin } from '../../utils/clientOrigin'
import { notifySafely } from '../../utils/notifySafely'
import { sendTaskAssignedEmail } from '../../services/email/email.service'
import * as notificationsService from '../notifications/notifications.service'

type AuthedUser = { id: string; role: Role }

const taskInclude = {
  assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
  tags: { include: { tag: true } },
} as const

interface TaskRecord {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  dueDate: Date | null
  position: number
  projectId: string
  assigneeId: string | null
  parentTaskId: string | null
  createdAt: Date
  updatedAt: Date
  assignee?: { id: string; name: string; email: string; avatarUrl: string | null } | null
  tags?: { tag: { id: string; name: string; color: string } }[]
}

export function toTaskDto(task: TaskRecord): TaskDto {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    // Prisma's TaskStatus/Priority enums have identical string values to
    // @taskflow/types' — value-preserving casts, not runtime conversions.
    status: task.status as TaskDto['status'],
    priority: task.priority as TaskDto['priority'],
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    position: task.position,
    projectId: task.projectId,
    assigneeId: task.assigneeId,
    assignee: task.assignee ?? null,
    parentTaskId: task.parentTaskId,
    tags: task.tags?.map((t) => t.tag),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  }
}

export function scopeWhere(user: AuthedUser) {
  if (user.role === Role.ADMIN) return {}
  if (user.role === Role.PROJECT_MANAGER) return { project: { managerId: user.id } }
  return { project: { members: { some: { userId: user.id } } } }
}

export { taskInclude }

async function assertAssigneeEligible(projectId: string, assigneeId: string | null | undefined): Promise<void> {
  if (!assigneeId) return
  const project = await prisma.project.findFirst({ where: { id: projectId }, select: { managerId: true } })
  if (!project) throw new AppError('Project not found', 404)
  if (assigneeId === project.managerId) return

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: assigneeId } },
  })
  if (!membership) {
    throw new AppError('Assignee must be a member of the project', 422, [
      { field: 'assigneeId', message: 'Assignee must be a member of the project' },
    ])
  }
}

async function assertParentInSameProject(
  projectId: string,
  parentTaskId: string | null | undefined,
  selfId?: string,
): Promise<void> {
  if (!parentTaskId) return
  if (parentTaskId === selfId) {
    throw new AppError('A task cannot be its own parent', 422, [
      { field: 'parentTaskId', message: 'A task cannot be its own parent' },
    ])
  }
  const parent = await prisma.task.findFirst({ where: { id: parentTaskId }, select: { projectId: true } })
  if (!parent) {
    throw new AppError('Parent task not found', 422, [
      { field: 'parentTaskId', message: 'Parent task not found' },
    ])
  }
  if (parent.projectId !== projectId) {
    throw new AppError('Parent task must belong to the same project', 422, [
      { field: 'parentTaskId', message: 'Parent task must belong to the same project' },
    ])
  }
}

async function assertTagsExist(tagIds: string[] | undefined): Promise<void> {
  if (!tagIds?.length) return
  const count = await prisma.tag.count({ where: { id: { in: tagIds } } })
  if (count !== tagIds.length) {
    throw new AppError('One or more tags do not exist', 422, [
      { field: 'tagIds', message: 'One or more tags do not exist' },
    ])
  }
}

async function nextPosition(projectId: string, status: TaskStatus): Promise<number> {
  const last = await prisma.task.findFirst({
    where: { projectId, status },
    orderBy: { position: 'desc' },
    select: { position: true },
  })
  return (last?.position ?? 0) + 1000
}

async function notifyAssignment(taskId: string, taskTitle: string, assigneeId: string, actorId: string) {
  await notifySafely(`task-assigned (task ${taskId})`, async () => {
    await notificationsService.notifyTaskAssigned(taskId, assigneeId, actorId)
    const assignee = await prisma.user.findFirst({ where: { id: assigneeId }, select: { name: true, email: true } })
    if (assignee) {
      await sendTaskAssignedEmail(assignee.email, assignee.name, taskTitle, `${clientOrigin()}/tasks/${taskId}`)
    }
  })
}

export async function list(
  user: AuthedUser,
  query: ListTasksQuery,
): Promise<{ data: TaskDto[]; total: number }> {
  const { skip, take } = toSkipTake(query.page, query.limit)
  const where = {
    ...scopeWhere(user),
    ...(query.projectId ? { projectId: query.projectId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.priority ? { priority: query.priority } : {}),
    ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
    ...(query.tag ? { tags: { some: { tag: { name: query.tag } } } } : {}),
    ...(query.dueBefore || query.dueAfter
      ? {
          dueDate: {
            ...(query.dueBefore ? { lte: query.dueBefore } : {}),
            ...(query.dueAfter ? { gte: query.dueAfter } : {}),
          },
        }
      : {}),
    ...(query.search
      ? {
          OR: [
            { title: { contains: query.search, mode: 'insensitive' as const } },
            { description: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip,
      take,
      orderBy: { [query.sort]: query.order },
      include: taskInclude,
    }),
    prisma.task.count({ where }),
  ])

  return { data: tasks.map(toTaskDto), total }
}

export function paginationMeta(query: ListTasksQuery, total: number) {
  return buildMeta(query.page, query.limit, total)
}

export async function getById(id: string): Promise<TaskDto> {
  const task = await prisma.task.findFirst({ where: { id }, include: taskInclude })
  if (!task) throw new AppError('Task not found', 404)
  return toTaskDto(task)
}

export async function create(user: AuthedUser, input: CreateTaskInput): Promise<TaskDto> {
  await assertAssigneeEligible(input.projectId, input.assigneeId)
  await assertParentInSameProject(input.projectId, input.parentTaskId)
  await assertTagsExist(input.tagIds)

  const position = await nextPosition(input.projectId, TaskStatus.TODO)

  const task = await prisma.task.create({
    data: {
      title: input.title,
      description: input.description,
      priority: input.priority,
      dueDate: input.dueDate,
      projectId: input.projectId,
      assigneeId: input.assigneeId ?? undefined,
      parentTaskId: input.parentTaskId ?? undefined,
      position,
      ...(input.tagIds?.length ? { tags: { create: input.tagIds.map((tagId) => ({ tagId })) } } : {}),
    },
    include: taskInclude,
  })

  if (task.assigneeId) {
    await notifyAssignment(task.id, task.title, task.assigneeId, user.id)
  }

  return toTaskDto(task)
}

export async function update(user: AuthedUser, id: string, input: UpdateTaskInput): Promise<TaskDto> {
  const existing = await prisma.task.findFirst({ where: { id } })
  if (!existing) throw new AppError('Task not found', 404)

  if (input.assigneeId !== undefined) await assertAssigneeEligible(existing.projectId, input.assigneeId)
  if (input.parentTaskId !== undefined) {
    await assertParentInSameProject(existing.projectId, input.parentTaskId, id)
  }
  if (input.tagIds !== undefined) await assertTagsExist(input.tagIds)

  const assigneeChanged = input.assigneeId !== undefined && input.assigneeId !== existing.assigneeId

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
      ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
      ...(input.parentTaskId !== undefined ? { parentTaskId: input.parentTaskId } : {}),
      ...(input.tagIds !== undefined
        ? { tags: { deleteMany: {}, create: input.tagIds.map((tagId) => ({ tagId })) } }
        : {}),
    },
    include: taskInclude,
  })

  if (assigneeChanged && task.assigneeId) {
    await notifyAssignment(task.id, task.title, task.assigneeId, user.id)
  }

  return toTaskDto(task)
}

export async function move(user: AuthedUser, id: string, input: MoveTaskInput): Promise<TaskDto> {
  const existing = await prisma.task.findFirst({ where: { id } })
  if (!existing) throw new AppError('Task not found', 404)

  const data: { status?: TaskStatus; position?: number } = {}
  if (input.status !== undefined) data.status = input.status
  if (input.position !== undefined) data.position = input.position

  const task = await prisma.task.update({ where: { id }, data, include: taskInclude })

  if (input.status !== undefined && input.status !== existing.status) {
    // Business-specific event, not a plain CRUD verb — logged explicitly
    // rather than relying on the generic UPDATED entry the $extends
    // middleware already wrote for this same call (see db/client.ts).
    await logActivity('task', id, 'STATUS_CHANGED', { from: existing.status, to: input.status })
    const assigneeId = task.assigneeId
    if (assigneeId && assigneeId !== user.id) {
      await notifySafely(`status-changed (task ${id})`, () =>
        notificationsService.notifyStatusChanged(id, assigneeId, user.id),
      )
    }
  }

  return toTaskDto(task)
}

export async function softDelete(id: string): Promise<void> {
  const existing = await prisma.task.findFirst({ where: { id } })
  if (!existing) throw new AppError('Task not found', 404)
  await prisma.task.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function restore(id: string): Promise<TaskDto> {
  const existing = await prismaUnfiltered.task.findUnique({ where: { id } })
  if (!existing) throw new AppError('Task not found', 404)
  if (!existing.deletedAt) throw new AppError('Task is not deleted', 400)

  const task = await prismaUnfiltered.task.update({
    where: { id },
    data: { deletedAt: null },
    include: taskInclude,
  })
  await logActivity('task', id, 'RESTORED')
  return toTaskDto(task)
}
