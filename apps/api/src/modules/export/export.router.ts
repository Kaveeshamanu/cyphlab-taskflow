import { Router } from 'express'
import { idParamSchema } from '@taskflow/types'
import { requireAuth } from '../../middlewares/auth'
import { requireProjectAccess } from '../../middlewares/projectAccess'
import { validate } from '../../middlewares/validate'
import * as controller from './export.controller'

export function createExportRouter(): Router {
  const router = Router()
  router.use(requireAuth)

  /**
   * @openapi
   * /export/projects/{id}.csv:
   *   get:
   *     tags: [Export]
   *     summary: Export a project's tasks as CSV (owner PM, admin)
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: CSV file of the project's tasks }
   *       403: { description: Only the project manager can perform this action }
   *       404: { description: Project not found }
   */
  router.get(
    '/projects/:id.csv',
    validate({ params: idParamSchema }),
    requireProjectAccess('manage', 'id'),
    controller.exportProjectTasksCsv,
  )

  return router
}
