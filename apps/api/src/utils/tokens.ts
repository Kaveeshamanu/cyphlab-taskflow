import { randomBytes, createHash } from 'node:crypto'

// Opaque bearer tokens (email verify, password reset) — random, single-use,
// hashed at rest so a DB dump doesn't hand over live tokens.
export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex')
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}
