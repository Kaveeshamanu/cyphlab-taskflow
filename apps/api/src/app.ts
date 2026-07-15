import path from 'node:path'
import express, { Application } from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import { env } from './config/env'
import { ok } from './utils/envelope'
import { requestId } from './middlewares/requestId'
import { errorHandler, notFoundHandler } from './middlewares/errorHandler'
import { createAuthRouter } from './modules/auth/auth.router'
import { createUsersRouter } from './modules/users/users.router'
import { createProjectsRouter } from './modules/projects/projects.router'
import { createTasksRouter } from './modules/tasks/tasks.router'
import { createCommentsRouter } from './modules/comments/comments.router'
import { createTaskAttachmentsRouter, createAttachmentsRouter } from './modules/attachments/attachments.router'
import { createNotificationsRouter } from './modules/notifications/notifications.router'
import { createActivityRouter } from './modules/activity/activity.router'
import { createSearchRouter } from './modules/search/search.router'
import { createDashboardRouter } from './modules/dashboard/dashboard.router'
import { createExportRouter } from './modules/export/export.router'
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

  // Local-driver attachments are served straight off disk; a no-op mount
  // when STORAGE_DRIVER=cloudinary since nothing is ever written here.
  app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)))

  mountSwagger(app)

  app.use('/api/v1/auth', createAuthRouter())
  app.use('/api/v1/users', createUsersRouter())
  app.use('/api/v1/projects', createProjectsRouter())
  // Nested task routers mounted before the general /tasks router — see
  // tasks.router.ts's own routes for why this ordering is defensive rather
  // than strictly required (Express falls through non-matching mounts).
  app.use('/api/v1/tasks/:taskId/comments', createCommentsRouter())
  app.use('/api/v1/tasks/:taskId/attachments', createTaskAttachmentsRouter())
  app.use('/api/v1/tasks', createTasksRouter())
  app.use('/api/v1/attachments', createAttachmentsRouter())
  app.use('/api/v1/notifications', createNotificationsRouter())
  app.use('/api/v1/activity', createActivityRouter())
  app.use('/api/v1/search', createSearchRouter())
  app.use('/api/v1/dashboard', createDashboardRouter())
  app.use('/api/v1/export', createExportRouter())

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
