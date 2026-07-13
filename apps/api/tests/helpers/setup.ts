// Global test setup — expanded in Phase 6
import { beforeAll, afterAll } from 'vitest'
import { prisma } from '../../src/db/client'

beforeAll(async () => {
  // ensure we can reach the DB before any test runs
})

afterAll(async () => {
  await prisma.$disconnect()
})
