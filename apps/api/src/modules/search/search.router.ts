import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth'
import { validate } from '../../middlewares/validate'
import * as schemas from './search.schemas'
import * as controller from './search.controller'

export function createSearchRouter(): Router {
  const router = Router()
  router.use(requireAuth)

  /**
   * @openapi
   * /search:
   *   get:
   *     tags: [Search]
   *     summary: Global search across projects, tasks, and (admin only) users — role-scoped
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: query
   *         name: q
   *         required: true
   *         schema: { type: string }
   *       - in: query
   *         name: type
   *         schema: { type: string, enum: [project, task, user] }
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 20 }
   *     responses:
   *       200: { description: "Search results grouped by entity: { projects, tasks, users }" }
   *       401: { description: Authentication required }
   *       422: { description: Validation failed }
   */
  router.get('/', validate({ query: schemas.searchQuerySchema }), controller.search)

  return router
}
