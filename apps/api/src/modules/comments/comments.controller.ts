import { Request, Response } from 'express'
import type { ListCommentsQuery } from '@taskflow/types'
import { asyncHandler } from '../../utils/asyncHandler'
import { created, paginated } from '../../utils/envelope'
import * as commentsService from './comments.service'

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListCommentsQuery
  const { data, total } = await commentsService.list(req.params.taskId, query)
  paginated(res, data, commentsService.paginationMeta(query, total))
})

export const create = asyncHandler(async (req: Request, res: Response) => {
  const comment = await commentsService.create(req.user!, req.params.taskId, req.body)
  created(res, comment, 'Comment added')
})
