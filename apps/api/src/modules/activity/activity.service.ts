import type { ActivityLogDto, ListActivityQuery } from '@taskflow/types'
import { prismaUnfiltered } from '../../db/client'
import { buildMeta, toSkipTake } from '../../utils/pagination'

interface ActivityLogRecord {
  id: string
  entityType: string
  entityId: string
  action: string
  actorId: string
  metadata: unknown
  createdAt: Date
  actor?: { id: string; name: string }
}

function toDto(log: ActivityLogRecord): ActivityLogDto {
  return {
    id: log.id,
    entityType: log.entityType,
    entityId: log.entityId,
    action: log.action,
    actorId: log.actorId,
    ...(log.actor ? { actor: log.actor } : {}),
    metadata: log.metadata,
    createdAt: log.createdAt.toISOString(),
  }
}

// Reads via prismaUnfiltered, not the soft-delete-filtered client — the
// audit trail must stay visible even when the entity it describes (or its
// actor) was later soft-deleted. See db/client.ts and PLAN.md.
export async function list(query: ListActivityQuery): Promise<{ data: ActivityLogDto[]; total: number }> {
  const { skip, take } = toSkipTake(query.page, query.limit)
  const where = {
    ...(query.entityType ? { entityType: query.entityType } : {}),
    ...(query.actorId ? { actorId: query.actorId } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: query.from } : {}),
            ...(query.to ? { lte: query.to } : {}),
          },
        }
      : {}),
  }

  const [logs, total] = await Promise.all([
    prismaUnfiltered.activityLog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { id: true, name: true } } },
    }),
    prismaUnfiltered.activityLog.count({ where }),
  ])

  return { data: logs.map(toDto), total }
}

export function paginationMeta(query: ListActivityQuery, total: number) {
  return buildMeta(query.page, query.limit, total)
}
