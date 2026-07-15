import { Request, Response } from 'express'
import type { ListNotificationsQuery } from '@taskflow/types'
import { asyncHandler } from '../../utils/asyncHandler'
import { ok, paginated } from '../../utils/envelope'
import * as notificationsService from './notifications.service'

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListNotificationsQuery
  const { data, total } = await notificationsService.list(req.user!, query)
  paginated(res, data, notificationsService.paginationMeta(query, total))
})

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  await notificationsService.markRead(req.user!, req.params.id)
  ok(res, null, 'Notification marked as read')
})

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  await notificationsService.markAllRead(req.user!)
  ok(res, null, 'All notifications marked as read')
})
