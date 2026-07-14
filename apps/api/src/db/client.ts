import { PrismaClient } from '@prisma/client'
import { getActorId } from '../utils/actorContext'

const globalForPrisma = globalThis as unknown as { basePrisma: PrismaClient }

const basePrisma =
  globalForPrisma.basePrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.basePrisma = basePrisma
}

// Unfiltered client: used ONLY by restore endpoints and admin activity-log
// queries that must read soft-deleted records, and by services writing
// ActivityLog rows directly (ActivityLog itself isn't soft-deletable, so it
// doesn't need — and shouldn't get — the extension below). No other file
// should import this.
export const prismaUnfiltered = basePrisma

// Models with a deletedAt column. `findFirst`/`findMany` get deletedAt: null
// injected automatically; `findUnique` is rerouted to findFirst (Prisma
// only allows unique-indexed fields in findUnique's `where`, so injecting
// deletedAt there throws).
const SOFT_DELETE_MODELS = new Set(['User', 'Project', 'Task', 'Comment'])

// The 4 soft-deletable entities get generic CREATED/UPDATED/DELETED/RESTORED
// audit entries automatically. Business-specific events that don't map to a
// plain CRUD verb (member added/removed, status changed) are logged
// explicitly by the owning service via logActivity() in utils/activityLog.ts,
// using prismaUnfiltered — not duplicated here.
const AUDITED_MODELS = SOFT_DELETE_MODELS

// Never let a DB dump-adjacent audit trail double as a credential leak.
const REDACTED_FIELDS = new Set(['passwordHash', 'emailVerifyToken', 'passwordResetToken'])

function redact(record: unknown): unknown {
  if (!record || typeof record !== 'object') return record
  const clone: Record<string, unknown> = { ...(record as Record<string, unknown>) }
  for (const field of REDACTED_FIELDS) {
    if (field in clone) clone[field] = '[redacted]'
  }
  return clone
}

function delegateFor(model: string) {
  const key = model.charAt(0).toLowerCase() + model.slice(1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (basePrisma as any)[key]
}

async function writeAuditLog(
  entityType: string,
  entityId: string,
  action: 'CREATED' | 'UPDATED' | 'DELETED' | 'RESTORED',
  metadata: Record<string, unknown>,
): Promise<void> {
  const actorId = getActorId()
  if (!actorId) return // no request context (e.g. seed script) — nothing to attribute to
  await prismaUnfiltered.activityLog.create({
    data: { entityType: entityType.toLowerCase(), entityId, action, actorId, metadata },
  })
}

function resolveUpdateAction(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
  before: { deletedAt?: Date | null } | null,
): 'UPDATED' | 'DELETED' | 'RESTORED' {
  if (!('deletedAt' in (data ?? {}))) return 'UPDATED'
  const wasDeleted = Boolean(before?.deletedAt)
  const willBeDeleted = data.deletedAt !== null
  if (!wasDeleted && willBeDeleted) return 'DELETED'
  if (wasDeleted && !willBeDeleted) return 'RESTORED'
  return 'UPDATED'
}

export const prisma = basePrisma.$extends({
  name: 'soft-delete-and-audit',
  query: {
    $allModels: {
      async findFirst({ model, args, query }) {
        if (SOFT_DELETE_MODELS.has(model)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (args as any).where = { ...(args as any).where, deletedAt: null }
        }
        return query(args)
      },
      async findMany({ model, args, query }) {
        if (SOFT_DELETE_MODELS.has(model)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (args as any).where = { ...(args as any).where, deletedAt: null }
        }
        return query(args)
      },
      async findUnique({ model, args }) {
        if (!SOFT_DELETE_MODELS.has(model)) {
          return delegateFor(model).findUnique(args)
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return delegateFor(model).findFirst({ where: { ...(args as any).where, deletedAt: null } })
      },
      async create({ model, args, query }) {
        const result = await query(args)
        if (AUDITED_MODELS.has(model)) {
          const record = result as { id: string }
          await writeAuditLog(model, record.id, 'CREATED', { after: redact(result) })
        }
        return result
      },
      async update({ model, args, query }) {
        if (!AUDITED_MODELS.has(model)) return query(args)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const before = await delegateFor(model).findFirst({ where: (args as any).where })
        const result = await query(args)
        const record = result as { id: string }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const action = resolveUpdateAction((args as any).data, before)
        await writeAuditLog(model, record.id, action, { before: redact(before), after: redact(result) })
        return result
      },
    },
  },
})
