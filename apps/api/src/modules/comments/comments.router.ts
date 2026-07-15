import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth'
import { validate } from '../../middlewares/validate'
import { requireTaskAccess } from '../tasks/tasks.guards'
import * as schemas from './comments.schemas'
import * as controller from './comments.controller'

// Mounted at /api/v1/tasks/:taskId/comments — mergeParams is required for
// req.params.taskId (matched by the parent mount path) to be visible here.
export function createCommentsRouter(): Router {
  const router = Router({ mergeParams: true })
  router.use(requireAuth, requireTaskAccess('member', 'taskId'))

  /**
   * @openapi
   * /tasks/{taskId}/comments:
   *   get:
   *     tags: [Comments]
   *     summary: List comments on a task (project member+)
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: taskId
   *         required: true
   *         schema: { type: string }
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 20 }
   *     responses:
   *       200: { description: Paginated list of comments }
   *       403: { description: You do not have access to this project }
   *       404: { description: Task not found }
   */
  router.get('/', validate({ query: schemas.listCommentsQuerySchema }), controller.list)

  /**
   * @openapi
   * /tasks/{taskId}/comments:
   *   post:
   *     tags: [Comments]
   *     summary: Add a comment to a task (project member+); @mentions notify the mentioned users
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: taskId
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [body]
   *             properties:
   *               body: { type: string }
   *     responses:
   *       201: { description: Comment added }
   *       403: { description: You do not have access to this project }
   *       404: { description: Task not found }
   *       422: { description: Validation failed }
   */
  router.post('/', validate({ body: schemas.createCommentSchema }), controller.create)

  return router
}
