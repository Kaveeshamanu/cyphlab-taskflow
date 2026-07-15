import { Router } from 'express'
import { Role } from '@taskflow/types'
import { idParamSchema } from '@taskflow/types'
import { requireAuth } from '../../middlewares/auth'
import { requireRole } from '../../middlewares/requireRole'
import { validate } from '../../middlewares/validate'
import * as schemas from './users.schemas'
import * as controller from './users.controller'

// Every route in this module is admin-only per the permission matrix
// ("CRUD any user / assign roles") — gated once at the router level rather
// than repeated on each route.
export function createUsersRouter(): Router {
  const router = Router()
  router.use(requireAuth, requireRole(Role.ADMIN))

  /**
   * @openapi
   * /users:
   *   get:
   *     tags: [Users]
   *     summary: List users (admin only)
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: query
   *         name: search
   *         schema: { type: string }
   *       - in: query
   *         name: role
   *         schema: { type: string, enum: [ADMIN, PROJECT_MANAGER, TEAM_MEMBER] }
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 20 }
   *     responses:
   *       200: { description: Paginated list of users }
   *       401: { description: Authentication required }
   *       403: { description: Insufficient permissions }
   */
  router.get('/', validate({ query: schemas.listUsersQuerySchema }), controller.list)

  /**
   * @openapi
   * /users:
   *   post:
   *     tags: [Users]
   *     summary: Create a user (admin only)
   *     security: [{ bearerAuth: [] }]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name, email, password]
   *             properties:
   *               name: { type: string }
   *               email: { type: string, format: email }
   *               password: { type: string, format: password }
   *               role: { type: string, enum: [ADMIN, PROJECT_MANAGER, TEAM_MEMBER] }
   *     responses:
   *       201: { description: User created }
   *       409: { description: Email already registered }
   *       422: { description: Validation failed }
   */
  router.post('/', validate({ body: schemas.createUserSchema }), controller.create)

  /**
   * @openapi
   * /users/{id}:
   *   patch:
   *     tags: [Users]
   *     summary: Update a user's profile fields (admin only)
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
   *               email: { type: string, format: email }
   *               avatarUrl: { type: string, nullable: true }
   *     responses:
   *       200: { description: User updated }
   *       404: { description: User not found }
   *       409: { description: Email already registered }
   *       422: { description: Validation failed }
   */
  router.patch(
    '/:id',
    validate({ params: idParamSchema, body: schemas.updateUserSchema }),
    controller.update,
  )

  /**
   * @openapi
   * /users/{id}/role:
   *   patch:
   *     tags: [Users]
   *     summary: Change a user's role (admin only)
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
   *             required: [role]
   *             properties:
   *               role: { type: string, enum: [ADMIN, PROJECT_MANAGER, TEAM_MEMBER] }
   *     responses:
   *       200: { description: Role updated }
   *       404: { description: User not found }
   *       422: { description: Validation failed }
   */
  router.patch(
    '/:id/role',
    validate({ params: idParamSchema, body: schemas.updateUserRoleSchema }),
    controller.updateRole,
  )

  /**
   * @openapi
   * /users/{id}:
   *   delete:
   *     tags: [Users]
   *     summary: Soft-delete a user (admin only)
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: User soft-deleted }
   *       404: { description: User not found }
   */
  router.delete('/:id', validate({ params: idParamSchema }), controller.remove)

  return router
}
