import { Request, Response } from 'express'
import { asyncHandler } from '../../utils/asyncHandler'
import { AppError, created, ok } from '../../utils/envelope'
import * as attachmentsService from './attachments.service'

export const list = asyncHandler(async (req: Request, res: Response) => {
  const attachments = await attachmentsService.list(req.params.taskId)
  ok(res, attachments)
})

export const upload = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new AppError('No file uploaded', 422, [{ field: 'file', message: 'File is required' }])
  const attachment = await attachmentsService.upload(req.user!, req.params.taskId, req.file)
  created(res, attachment, 'Attachment uploaded')
})

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await attachmentsService.remove(req.user!, req.params.id)
  ok(res, null, 'Attachment deleted')
})
