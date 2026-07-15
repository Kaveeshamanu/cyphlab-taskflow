import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth'
import * as controller from './dashboard.controller'

export function createDashboardRouter(): Router {
  const router = Router()
  router.use(requireAuth)

  /**
   * @openapi
   * /dashboard:
   *   get:
   *     tags: [Dashboard]
   *     summary: Role-specific dashboard payload (admin, PM, or team member shape)
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200: { description: Dashboard data, shaped by the caller's role }
   *       401: { description: Authentication required }
   */
  router.get('/', controller.getDashboard)

  return router
}
