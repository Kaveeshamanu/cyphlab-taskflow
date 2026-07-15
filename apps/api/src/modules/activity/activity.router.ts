import { Router } from 'express'
import { Role } from '@taskflow/types'
import { requireAuth } from '../../middlewares/auth'
import { requireRole } from '../../middlewares/requireRole'
import { validate } from '../../middlewares/validate'
import * as schemas from './activity.schemas'
import * as controller from './activity.controller'

export function createActivityRouter(): Router {
  const router = Router()
  router.use(requireAuth, requireRole(Role.ADMIN))

  /**
   * @openapi
   * /activity:
   *   get:
   *     tags: [Activity]
   *     summary: List the audit log (admin only)
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: query
   *         name: entityType
   *         schema: { type: string }
   *       - in: query
   *         name: actorId
   *         schema: { type: string }
   *       - in: query
   *         name: from
   *         schema: { type: string, format: date-time }
   *       - in: query
   *         name: to
   *         schema: { type: string, format: date-time }
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 20 }
   *     responses:
   *       200: { description: Paginated audit log }
   *       403: { description: Insufficient permissions }
   */
  router.get('/', validate({ query: schemas.listActivityQuerySchema }), controller.list)

  return router
}
