import { Router } from 'express'
import { idParamSchema } from '@taskflow/types'
import { requireAuth } from '../../middlewares/auth'
import { validate } from '../../middlewares/validate'
import * as schemas from './notifications.schemas'
import * as controller from './notifications.controller'

export function createNotificationsRouter(): Router {
  const router = Router()
  router.use(requireAuth)

  /**
   * @openapi
   * /notifications:
   *   get:
   *     tags: [Notifications]
   *     summary: List the current user's notifications
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 20 }
   *     responses:
   *       200: { description: Paginated list of notifications }
   *       401: { description: Authentication required }
   */
  router.get('/', validate({ query: schemas.listNotificationsQuerySchema }), controller.list)

  /**
   * @openapi
   * /notifications/read-all:
   *   patch:
   *     tags: [Notifications]
   *     summary: Mark all of the current user's notifications as read
   *     security: [{ bearerAuth: [] }]
   *     responses:
   *       200: { description: All notifications marked as read }
   */
  router.patch('/read-all', controller.markAllRead)

  /**
   * @openapi
   * /notifications/{id}/read:
   *   patch:
   *     tags: [Notifications]
   *     summary: Mark a single notification as read
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: Notification marked as read }
   *       404: { description: Notification not found }
   */
  router.patch('/:id/read', validate({ params: idParamSchema }), controller.markRead)

  return router
}
