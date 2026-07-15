import { Request, Response } from 'express'
import type { ListProjectsQuery } from '@taskflow/types'
import { asyncHandler } from '../../utils/asyncHandler'
import { created, ok, paginated } from '../../utils/envelope'
import * as projectsService from './projects.service'

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListProjectsQuery
  const { data, total } = await projectsService.list(req.user!, query)
  paginated(res, data, projectsService.paginationMeta(query, total))
})

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const project = await projectsService.getById(req.params.id)
  ok(res, project)
})

export const create = asyncHandler(async (req: Request, res: Response) => {
  const project = await projectsService.create(req.user!, req.body)
  created(res, project, 'Project created')
})

export const update = asyncHandler(async (req: Request, res: Response) => {
  const project = await projectsService.update(req.params.id, req.body)
  ok(res, project, 'Project updated')
})

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await projectsService.softDelete(req.params.id)
  ok(res, null, 'Project deleted')
})

export const restore = asyncHandler(async (req: Request, res: Response) => {
  const project = await projectsService.restore(req.params.id)
  ok(res, project, 'Project restored')
})

export const addMember = asyncHandler(async (req: Request, res: Response) => {
  await projectsService.addMember(req.params.id, req.body)
  created(res, null, 'Member added')
})

export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  await projectsService.removeMember(req.params.id, req.params.uid)
  ok(res, null, 'Member removed')
})
