import { Router } from 'express'
import { idParamSchema } from '@taskflow/types'
import { requireAuth } from '../../middlewares/auth'
import { validate } from '../../middlewares/validate'
import { requireTaskAccess } from '../tasks/tasks.guards'
import { attachmentUpload } from './attachments.upload'
import * as controller from './attachments.controller'

// Mounted at /api/v1/tasks/:taskId/attachments — mergeParams is required for
// req.params.taskId (matched by the parent mount path) to be visible here.
export function createTaskAttachmentsRouter(): Router {
  const router = Router({ mergeParams: true })
  router.use(requireAuth, requireTaskAccess('member', 'taskId'))

  /**
   * @openapi
   * /tasks/{taskId}/attachments:
   *   get:
   *     tags: [Attachments]
   *     summary: List attachments on a task (project member+)
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: taskId
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: List of attachments }
   *       403: { description: You do not have access to this project }
   *       404: { description: Task not found }
   */
  router.get('/', controller.list)

  /**
   * @openapi
   * /tasks/{taskId}/attachments:
   *   post:
   *     tags: [Attachments]
   *     summary: Upload an attachment to a task (project member+) — max 5MB, MIME allowlist
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: taskId
   *         required: true
   *         schema: { type: string }
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required: [file]
   *             properties:
   *               file: { type: string, format: binary }
   *     responses:
   *       201: { description: Attachment uploaded }
   *       403: { description: You do not have access to this project }
   *       404: { description: Task not found }
   *       422: { description: Unsupported file type, missing file, or file too large }
   */
  router.post('/', attachmentUpload.single('file'), controller.upload)

  return router
}

export function createAttachmentsRouter(): Router {
  const router = Router()
  router.use(requireAuth)

  /**
   * @openapi
   * /attachments/{id}:
   *   delete:
   *     tags: [Attachments]
   *     summary: Delete an attachment (uploader, owner PM, or admin)
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200: { description: Attachment deleted }
   *       403: { description: You do not have permission to delete this attachment }
   *       404: { description: Attachment not found }
   */
  router.delete('/:id', validate({ params: idParamSchema }), controller.remove)

  return router
}
