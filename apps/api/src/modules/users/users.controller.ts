import { Request, Response } from 'express'
import type { ListUsersQuery } from '@taskflow/types'
import { asyncHandler } from '../../utils/asyncHandler'
import { created, ok, paginated } from '../../utils/envelope'
import * as usersService from './users.service'

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListUsersQuery
  const { data, total } = await usersService.list(query)
  paginated(res, data, usersService.paginationMeta(query, total))
})

export const create = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.create(req.body)
  created(res, user, 'User created')
})

export const update = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.update(req.params.id, req.body)
  ok(res, user, 'User updated')
})

export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.updateRole(req.params.id, req.body)
  ok(res, user, 'Role updated')
})

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await usersService.softDelete(req.params.id)
  ok(res, null, 'User deleted')
})
