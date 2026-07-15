import { Request, Response } from 'express'
import type { ListActivityQuery } from '@taskflow/types'
import { asyncHandler } from '../../utils/asyncHandler'
import { paginated } from '../../utils/envelope'
import * as activityService from './activity.service'

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListActivityQuery
  const { data, total } = await activityService.list(query)
  paginated(res, data, activityService.paginationMeta(query, total))
})
