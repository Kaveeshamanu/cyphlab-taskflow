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
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const actorId = getActorId()
  if (!actorId) return
  await prismaUnfiltered.activityLog.create({
    data: { entityType, entityId, action, actorId, metadata },
  })
}
