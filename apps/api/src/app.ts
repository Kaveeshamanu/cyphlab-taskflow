import express, { Application } from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import { env } from './config/env'
import { ok } from './utils/envelope'
import { requestId } from './middlewares/requestId'
import { errorHandler, notFoundHandler } from './middlewares/errorHandler'
import { createAuthRouter } from './modules/auth/auth.router'
import { mountSwagger } from './openapi/swagger'

export function createApp(): Application {
  const app = express()
  const allowedOrigins = env.CLIENT_URL.split(',').map((origin) => origin.trim())

  // HSTS force-upgrades the origin to https:// for the header's max-age
  // window. Render terminates TLS in prod, so that's correct there — but
  // the local/Docker stack only speaks HTTP, so a browser that has ever
  // seen this header locally will fail every request with a TLS error
  // until the HSTS entry expires. Only send it in production.
  app.use(helmet({ hsts: env.NODE_ENV === 'production' }))
  app.use(cors({ origin: allowedOrigins, credentials: true }))
  app.use(requestId)
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(cookieParser())

  app.get('/api/health', (_req, res) => {
    ok(res, { status: 'ok', timestamp: new Date().toISOString() })
  })

  mountSwagger(app)

  app.use('/api/v1/auth', createAuthRouter())

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
