import { Request, Response } from 'express'
import type { ListTasksQuery } from '@taskflow/types'
import { asyncHandler } from '../../utils/asyncHandler'
import { created, ok, paginated } from '../../utils/envelope'
import * as tasksService from './tasks.service'

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListTasksQuery
  const { data, total } = await tasksService.list(req.user!, query)
  paginated(res, data, tasksService.paginationMeta(query, total))
})

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const task = await tasksService.getById(req.params.id)
  ok(res, task)
})

export const create = asyncHandler(async (req: Request, res: Response) => {
  const task = await tasksService.create(req.user!, req.body)
  created(res, task, 'Task created')
})

export const update = asyncHandler(async (req: Request, res: Response) => {
  const task = await tasksService.update(req.user!, req.params.id, req.body)
  ok(res, task, 'Task updated')
})

export const move = asyncHandler(async (req: Request, res: Response) => {
  const task = await tasksService.move(req.user!, req.params.id, req.body)
  ok(res, task, 'Task moved')
})

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await tasksService.softDelete(req.params.id)
  ok(res, null, 'Task deleted')
})

export const restore = asyncHandler(async (req: Request, res: Response) => {
  const task = await tasksService.restore(req.params.id)
  ok(res, task, 'Task restored')
})
