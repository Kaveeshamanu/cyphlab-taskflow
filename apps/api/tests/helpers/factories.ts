import { randomUUID } from 'node:crypto'

export function uniqueEmail(prefix = 'test'): string {
  return `${prefix}-${randomUUID()}@example.com`
}
