import { NotifType } from '@taskflow/types'
import type { ListNotificationsQuery, NotificationDto } from '@taskflow/types'
import { prisma } from '../../db/client'
import { AppError } from '../../utils/envelope'
import { buildMeta, toSkipTake } from '../../utils/pagination'
import { emitToUser } from '../../socket/socket.server'

type AuthedUser = { id: string }

interface NotificationRecord {
  id: string
  type: string
  userId: string
  actorId: string
  entityType: string
  entityId: string
  isRead: boolean
  createdAt: Date
  actor?: { id: string; name: string; avatarUrl: string | null }
}

function toDto(n: NotificationRecord): NotificationDto {
  return {
    id: n.id,
    type: n.type as NotifType,
    userId: n.userId,
    actorId: n.actorId,
    ...(n.actor ? { actor: n.actor } : {}),
    entityType: n.entityType,
    entityId: n.entityId,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  }
}

interface CreateNotificationInput {
  type: NotifType
  userId: string
  actorId: string
  entityType: string
  entityId: string
}

// Shared by every trigger below (task assigned, @mention, comment on your
// task, status changed on your task). Never notifies a user about their own
// action — e.g. a PM assigning a task to themselves generates no noise.
async function createNotification(input: CreateNotificationInput): Promise<void> {
  if (input.userId === input.actorId) return

  const notification = await prisma.notification.create({
    data: input,
    include: { actor: { select: { id: true, name: true, avatarUrl: true } } },
  })
  emitToUser(input.userId, 'notification:new', toDto(notification))
}

export async function notifyTaskAssigned(taskId: string, assigneeId: string, actorId: string): Promise<void> {
  await createNotification({
    type: NotifType.TASK_ASSIGNED,
    userId: assigneeId,
    actorId,
    entityType: 'task',
    entityId: taskId,
  })
}

export async function notifyStatusChanged(taskId: string, assigneeId: string, actorId: string): Promise<void> {
  await createNotification({
    type: NotifType.STATUS_CHANGED,
    userId: assigneeId,
    actorId,
    entityType: 'task',
    entityId: taskId,
  })
}

export async function notifyCommentOnTask(taskId: string, taskOwnerId: string, actorId: string): Promise<void> {
  await createNotification({
    type: NotifType.COMMENT_ON_TASK,
    userId: taskOwnerId,
    actorId,
    entityType: 'task',
    entityId: taskId,
  })
}

export async function notifyMention(commentId: string, mentionedUserId: string, actorId: string): Promise<void> {
  await createNotification({
    type: NotifType.MENTION,
    userId: mentionedUserId,
    actorId,
    entityType: 'comment',
    entityId: commentId,
  })
}

export async function list(
  user: AuthedUser,
  query: ListNotificationsQuery,
): Promise<{ data: NotificationDto[]; total: number }> {
  const { skip, take } = toSkipTake(query.page, query.limit)
  const where = { userId: user.id }

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { id: true, name: true, avatarUrl: true } } },
    }),
    prisma.notification.count({ where }),
  ])

  return { data: notifications.map(toDto), total }
}

export function paginationMeta(query: ListNotificationsQuery, total: number) {
  return buildMeta(query.page, query.limit, total)
}

export async function markRead(user: AuthedUser, id: string): Promise<void> {
  const { count } = await prisma.notification.updateMany({
    where: { id, userId: user.id },
    data: { isRead: true },
  })
  if (count === 0) throw new AppError('Notification not found', 404)
}

export async function markAllRead(user: AuthedUser): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  })
}
