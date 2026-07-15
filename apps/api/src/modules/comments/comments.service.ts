import type { CommentDto, CreateCommentInput, ListCommentsQuery } from '@taskflow/types'
import { prisma } from '../../db/client'
import { AppError } from '../../utils/envelope'
import { buildMeta, toSkipTake } from '../../utils/pagination'
import { extractMentionTokens, resolveMentions } from '../../utils/mentions'
import { notifySafely } from '../../utils/notifySafely'
import * as notificationsService from '../notifications/notifications.service'

type AuthedUser = { id: string }

interface CommentRecord {
  id: string
  body: string
  taskId: string
  authorId: string
  createdAt: Date
  updatedAt: Date
  author?: { id: string; name: string; avatarUrl: string | null }
  mentions?: { userId: string }[]
}

function toCommentDto(comment: CommentRecord): CommentDto {
  return {
    id: comment.id,
    body: comment.body,
    taskId: comment.taskId,
    authorId: comment.authorId,
    ...(comment.author ? { author: comment.author } : {}),
    mentionedUserIds: comment.mentions?.map((m) => m.userId) ?? [],
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
  }
}

const commentInclude = {
  author: { select: { id: true, name: true, avatarUrl: true } },
  mentions: { select: { userId: true } },
} as const

export async function list(
  taskId: string,
  query: ListCommentsQuery,
): Promise<{ data: CommentDto[]; total: number }> {
  const { skip, take } = toSkipTake(query.page, query.limit)
  const where = { taskId }

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({ where, skip, take, orderBy: { createdAt: 'asc' }, include: commentInclude }),
    prisma.comment.count({ where }),
  ])

  return { data: comments.map(toCommentDto), total }
}

export function paginationMeta(query: ListCommentsQuery, total: number) {
  return buildMeta(query.page, query.limit, total)
}

export async function create(user: AuthedUser, taskId: string, input: CreateCommentInput): Promise<CommentDto> {
  const task = await prisma.task.findFirst({ where: { id: taskId }, select: { projectId: true, assigneeId: true } })
  if (!task) throw new AppError('Task not found', 404)

  const tokens = extractMentionTokens(input.body)
  const mentionedUserIds = await resolveMentions(task.projectId, tokens)

  const comment = await prisma.comment.create({
    data: {
      body: input.body,
      taskId,
      authorId: user.id,
      ...(mentionedUserIds.length ? { mentions: { create: mentionedUserIds.map((userId) => ({ userId })) } } : {}),
    },
    include: commentInclude,
  })

  for (const userId of mentionedUserIds) {
    await notifySafely(`mention (comment ${comment.id})`, () =>
      notificationsService.notifyMention(comment.id, userId, user.id),
    )
  }
  // "Comment on your task" only fires for the task's assignee, and only if
  // they weren't already notified above via an explicit @mention.
  const assigneeId = task.assigneeId
  if (assigneeId && assigneeId !== user.id && !mentionedUserIds.includes(assigneeId)) {
    await notifySafely(`comment-on-task (task ${taskId})`, () =>
      notificationsService.notifyCommentOnTask(taskId, assigneeId, user.id),
    )
  }

  return toCommentDto(comment)
}
