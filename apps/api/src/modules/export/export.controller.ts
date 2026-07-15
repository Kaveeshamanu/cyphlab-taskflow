import { Request, Response } from 'express'
import { asyncHandler } from '../../utils/asyncHandler'
import * as exportService from './export.service'

export const exportProjectTasksCsv = asyncHandler(async (req: Request, res: Response) => {
  const { filename, csv } = await exportService.exportProjectTasksCsv(req.params.id)
  res.type('text/csv').setHeader('Content-Disposition', `attachment; filename="${filename}"`).send(csv)
})
