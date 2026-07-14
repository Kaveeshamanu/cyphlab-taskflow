import { Prisma } from '@prisma/client'
import { prismaUnfiltered } from '../db/client'
import { getActorId } from './actorContext'

// For business events that don't map to a plain CRUD verb — member
// added/removed, task status changed via /move — and so aren't covered by
// the generic CREATED/UPDATED/DELETED/RESTORED logging in db/client.ts's
// $extends. Services call this explicitly; controllers never should.
export async function logActivity(
  entityType: string,
  entityId: string,
  action: string,
  metadata?: Prisma.InputJsonValue,
): Promise<void> {
  const actorId = getActorId()
  if (!actorId) return
  await prismaUnfiltered.activityLog.create({
    data: {
      entityType,
      entityId,
      action,
      actorId,
      // Prisma's Json column needs an explicit sentinel for "no value" —
      // an omitted key and a stored SQL NULL aren't the same to Prisma's
      // Json input type, so undefined is mapped to Prisma.JsonNull rather
      // than left for the field to default/cast on its own.
      metadata: metadata ?? Prisma.JsonNull,
    },
  })
}
