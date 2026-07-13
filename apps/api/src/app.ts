import express, { Application } from 'express'
import { ok } from './utils/envelope'

export function createApp(): Application {
  const app = express()

  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  app.get('/api/health', (_req, res) => {
    ok(res, { status: 'ok', timestamp: new Date().toISOString() })
  })

  return app
}
