import { Router } from 'express'
import { Role } from '@taskflow/types'
import { requireAuth } from '../../middlewares/auth'
import { requireRole } from '../../middlewares/requireRole'
import { requireProjectAccess } from '../../middlewares/projectAccess'
import { validate } from '../../middlewares/validate'
import * as schemas from './projects.schemas'
import * as controller from './projects.controller'

export function createProjectsRouter(): Router {
  const router = Router()
  router.use(requireAuth)

  /**
   * @openapi
   * /projects:
   *   get:
   *     tags: [Projects]
   *     summary: List projects, scoped by role (admin sees all, PM sees own, member sees theirs)
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: query
   *         name: search
   *         schema: { type: string }
   *       - in: query
   *         name: status
   *         schema: { type: string, enum: [PLANNING, ACTIVE, ON_HOLD, COMPLETED, CANCELLED] }
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 20 }
   *     responses:
   *       200: { description: Paginated list of projects }
   *       401: { description: Authentication required }
   */
  router.get('/', validate({ query: schemas.listProjectsQuerySchema }), controller.list)

  /**
   * @openapi
   * /projects:
   *   post:
   *     tags: [Projects]
   *     summary: Create a project (admin, PM)
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name]
   *             properties:
   *               name: { type: string }
   *               description: { type: string }
   *               status: { type: string, enum: [PLANNING, ACTIVE, ON_HOLD, COMPLETED, CANCELLED] }
   *     responses:
   *       201: { description: Project created }
   *       403: { description: Insufficient permissions }
   *       422: { description: Validation failed }
   */
  router.post(
    '/',
    requireRole(Role.ADMIN, Role.PROJECT_MANAGER),
    validate({ body: schemas.createProjectSchema }),
    controller.create,
  )

  /**
   * @openapi
   * /projects/{id}:
   *   get:
   *     tags: [Projects]
   *     summary: Get a project by id (project member, owner PM, or admin)
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: Project detail }
   *       403: { description: Not a member of this project }
   *       404: { description: Project not found }
   */
  router.get(
    '/:id',
    validate({ params: schemas.projectIdParamsSchema }),
    requireProjectAccess('member', 'id'),
    controller.getById,
  )

  /**
   * @openapi
   * /projects/{id}:
   *   patch:
   *     tags: [Projects]
   *     summary: Update a project (owner PM, admin)
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
   *               name: { type: string }
   *               description: { type: string, nullable: true }
   *               status: { type: string, enum: [PLANNING, ACTIVE, ON_HOLD, COMPLETED, CANCELLED] }
   *     responses:
   *       200: { description: Project updated }
   *       403: { description: Only the project manager can perform this action }
   *       404: { description: Project not found }
   *       422: { description: Validation failed }
   */
  router.patch(
    '/:id',
    validate({ params: schemas.projectIdParamsSchema, body: schemas.updateProjectSchema }),
    requireProjectAccess('manage', 'id'),
    controller.update,
  )

  /**
   * @openapi
   * /projects/{id}:
   *   delete:
   *     tags: [Projects]
   *     summary: Soft-delete a project (owner PM, admin)
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: Project deleted }
   *       403: { description: Only the project manager can perform this action }
   *       404: { description: Project not found }
   */
  router.delete(
    '/:id',
    validate({ params: schemas.projectIdParamsSchema }),
    requireProjectAccess('manage', 'id'),
    controller.remove,
  )

  /**
   * @openapi
   * /projects/{id}/restore:
   *   post:
   *     tags: [Projects]
   *     summary: Restore a soft-deleted project (admin only)
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: Project restored }
   *       400: { description: Project is not deleted }
   *       403: { description: Insufficient permissions }
   *       404: { description: Project not found }
   */
  router.post(
    '/:id/restore',
    requireRole(Role.ADMIN),
    validate({ params: schemas.projectIdParamsSchema }),
    controller.restore,
  )

  /**
   * @openapi
   * /projects/{id}/members:
   *   post:
   *     tags: [Projects]
   *     summary: Add a member to a project (owner PM, admin)
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
   *             required: [userId]
   *             properties:
   *               userId: { type: string }
   *     responses:
   *       201: { description: Member added }
   *       403: { description: Only the project manager can perform this action }
   *       404: { description: Project or user not found }
   *       409: { description: User is already a member }
   *       422: { description: Validation failed }
   */
  router.post(
    '/:id/members',
    validate({ params: schemas.projectIdParamsSchema, body: schemas.addProjectMemberSchema }),
    requireProjectAccess('manage', 'id'),
    controller.addMember,
  )

  /**
   * @openapi
   * /projects/{id}/members/{uid}:
   *   delete:
   *     tags: [Projects]
   *     summary: Remove a member from a project (owner PM, admin)
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *       - in: path
   *         name: uid
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: Member removed }
   *       403: { description: Only the project manager can perform this action }
   *       404: { description: Membership not found }
   */
  router.delete(
    '/:id/members/:uid',
    validate({ params: schemas.projectMemberParamsSchema }),
    requireProjectAccess('manage', 'id'),
    controller.removeMember,
  )

  return router
}
