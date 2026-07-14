import { AsyncLocalStorage } from 'node:async_hooks'

interface ActorContext {
  actorId: string | null
}

const storage = new AsyncLocalStorage<ActorContext>()

// Threads the authenticated user's id through the request's async call chain
// so the Prisma audit-log extension (Phase 3) can attribute writes without
// every service function taking an actorId parameter.
export function runWithActor<T>(actorId: string | null, fn: () => T): T {
  return storage.run({ actorId }, fn)
}

export function getActorId(): string | null {
  return storage.getStore()?.actorId ?? null
}
