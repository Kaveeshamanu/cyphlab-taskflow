import { Request, Response } from 'express'
import type { SearchQuery } from '@taskflow/types'
import { asyncHandler } from '../../utils/asyncHandler'
import { ok } from '../../utils/envelope'
import * as searchService from './search.service'

export const search = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as SearchQuery
  const results = await searchService.search(req.user!, query)
  ok(res, results)
})
