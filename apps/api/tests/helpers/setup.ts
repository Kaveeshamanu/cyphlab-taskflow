import path from 'node:path'
import dotenv from 'dotenv'

// Must run before any test file (or the modules it imports) touches
// src/config/env.ts, so the isolated test database and test-only secrets
// are in process.env first. src/config/env.ts's own `dotenv/config` call
// looks for a plain `.env` relative to cwd, finds none in apps/api, and
// is a no-op — it never overwrites what we set here.
dotenv.config({ path: path.resolve(__dirname, '../../.env.test'), override: true })

import { beforeAll, afterAll } from 'vitest'
import { prisma } from '../../src/db/client'

beforeAll(async () => {
  // ensure we can reach the DB before any test runs
})

afterAll(async () => {
  await prisma.$disconnect()
})
