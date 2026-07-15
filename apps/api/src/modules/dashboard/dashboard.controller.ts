import { Request, Response } from 'express'
import { asyncHandler } from '../../utils/asyncHandler'
import { ok } from '../../utils/envelope'
import * as dashboardService from './dashboard.service'

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardService.getDashboard(req.user!)
  ok(res, data)
})
