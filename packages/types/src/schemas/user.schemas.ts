import { z } from 'zod'
import { Role } from '../types/enums'

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100)
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number')

export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Must be a valid email'),
  password: passwordSchema,
  role: z.nativeEnum(Role).default(Role.TEAM_MEMBER),
})

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email('Must be a valid email').optional(),
  avatarUrl: z.string().url().nullable().optional(),
})

export const updateUserRoleSchema = z.object({
  role: z.nativeEnum(Role),
})

export const listUsersQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  role: z.nativeEnum(Role).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>
