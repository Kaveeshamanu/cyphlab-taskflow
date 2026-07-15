import { z } from 'zod'
import { ProjectStatus } from '../types/enums'

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(150),
  description: z.string().max(2000).optional(),
  status: z.nativeEnum(ProjectStatus).default(ProjectStatus.PLANNING),
})

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  description: z.string().max(2000).nullable().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
})

export const listProjectsQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const addProjectMemberSchema = z.object({
  userId: z.string().cuid(),
})

export const projectIdParamsSchema = z.object({
  id: z.string().cuid(),
})

export const projectMemberParamsSchema = z.object({
  id: z.string().cuid(),
  uid: z.string().cuid(),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>
export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>
