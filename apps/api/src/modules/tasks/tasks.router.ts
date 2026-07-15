import { Router } from 'express'
import { Role, idParamSchema } from '@taskflow/types'
import { requireAuth } from '../../middlewares/auth'
import { requireRole } from '../../middlewares/requireRole'
import { requireProjectAccessFromBody } from '../../middlewares/projectAccess'
import { validate } from '../../middlewares/validate'
import { requireTaskAccess, requireTaskMoveAccess } from './tasks.guards'
import * as schemas from './tasks.schemas'
import * as controller from './tasks.controller'

export function createTasksRouter(): Router {
  const router = Router()
  router.use(requireAuth)

  /**
   * @openapi
   * /tasks:
   *   get:
   *     tags: [Tasks]
   *     summary: List tasks, scoped by role, with filters
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: query
   *         name: projectId
   *         schema: { type: string }
   *       - in: query
   *         name: status
   *         schema: { type: string, enum: [TODO, IN_PROGRESS, IN_REVIEW, DONE] }
   *       - in: query
   *         name: priority
   *         schema: { type: string, enum: [LOW, MEDIUM, HIGH, URGENT] }
   *       - in: query
   *         name: assigneeId
   *         schema: { type: string }
   *       - in: query
   *         name: tag
   *         schema: { type: string }
   *       - in: query
   *         name: dueBefore
   *         schema: { type: string, format: date-time }
   *       - in: query
   *         name: dueAfter
   *         schema: { type: string, format: date-time }
   *       - in: query
   *         name: search
   *         schema: { type: string }
   *       - in: query
   *         name: sort
   *         schema: { type: string, enum: [createdAt, dueDate, priority, position, title] }
   *       - in: query
   *         name: order
   *         schema: { type: string, enum: [asc, desc] }
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 20 }
   *     responses:
   *       200: { description: Paginated list of tasks }
   *       401: { description: Authentication required }
   */
  router.get('/', validate({ query: schemas.listTasksQuerySchema }), controller.list)

  /**
   * @openapi
   * /tasks:
   *   post:
   *     tags: [Tasks]
   *     summary: Create a task (owner PM, admin)
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [title, projectId]
   *             properties:
   *               title: { type: string }
   *               description: { type: string }
   *               priority: { type: string, enum: [LOW, MEDIUM, HIGH, URGENT] }
   *               dueDate: { type: string, format: date-time }
   *               projectId: { type: string }
   *               assigneeId: { type: string, nullable: true }
   *               parentTaskId: { type: string, nullable: true }
   *               tagIds: { type: array, items: { type: string } }
   *     responses:
   *       201: { description: Task created }
   *       403: { description: Only the project manager can perform this action }
   *       404: { description: Project not found }
   *       422: { description: Validation failed, or assignee is not a project member }
   */
  router.post(
    '/',
    requireRole(Role.ADMIN, Role.PROJECT_MANAGER),
    validate({ body: schemas.createTaskSchema }),
    requireProjectAccessFromBody('manage'),
    controller.create,
  )

  /**
   * @openapi
   * /tasks/{id}:
   *   get:
   *     tags: [Tasks]
   *     summary: Get a task by id (project member, owner PM, or admin)
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: Task detail }
   *       403: { description: You do not have access to this project }
   *       404: { description: Task not found }
   */
  router.get('/:id', validate({ params: idParamSchema }), requireTaskAccess('member'), controller.getById)

  /**
   * @openapi
   * /tasks/{id}:
   *   patch:
   *     tags: [Tasks]
   *     summary: Update a task's fields (owner PM, admin) — not status/position, see /move
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               title: { type: string }
   *               description: { type: string, nullable: true }
   *               priority: { type: string, enum: [LOW, MEDIUM, HIGH, URGENT] }
   *               dueDate: { type: string, format: date-time, nullable: true }
   *               assigneeId: { type: string, nullable: true }
   *               parentTaskId: { type: string, nullable: true }
   *               tagIds: { type: array, items: { type: string } }
   *     responses:
   *       200: { description: Task updated }
   *       403: { description: Only the project manager can perform this action }
   *       404: { description: Task not found }
   *       422: { description: Validation failed, or assignee is not a project member }
   */
  router.patch(
    '/:id',
    validate({ params: idParamSchema, body: schemas.updateTaskSchema }),
    requireTaskAccess('manage'),
    controller.update,
  )

  /**
   * @openapi
   * /tasks/{id}/move:
   *   patch:
   *     tags: [Tasks]
   *     summary: Kanban move — atomic status and/or position update (assignee, owner PM, admin)
   *     description: A single atomic endpoint so a Team Member dragging their own assigned card doesn't need manage rights over the whole project.
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               status: { type: string, enum: [TODO, IN_PROGRESS, IN_REVIEW, DONE] }
   *               position: { type: number }
   *     responses:
   *       200: { description: Task moved }
   *       403: { description: You can only move tasks assigned to you }
   *       404: { description: Task not found }
   *       422: { description: Validation failed — at least one of status or position is required }
   */
  router.patch(
    '/:id/move',
    validate({ params: idParamSchema, body: schemas.moveTaskSchema }),
    requireTaskMoveAccess(),
    controller.move,
  )

  /**
   * @openapi
   * /tasks/{id}:
   *   delete:
   *     tags: [Tasks]
   *     summary: Soft-delete a task (owner PM, admin)
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: Task deleted }
   *       403: { description: Only the project manager can perform this action }
   *       404: { description: Task not found }
   */
  router.delete('/:id', validate({ params: idParamSchema }), requireTaskAccess('manage'), controller.remove)

  /**
   * @openapi
   * /tasks/{id}/restore:
   *   post:
   *     tags: [Tasks]
   *     summary: Restore a soft-deleted task (admin only)
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: Task restored }
   *       400: { description: Task is not deleted }
   *       403: { description: Insufficient permissions }
   *       404: { description: Task not found }
   */
  router.post(
    '/:id/restore',
    requireRole(Role.ADMIN),
    validate({ params: idParamSchema }),
    controller.restore,
  )

  return router
}
