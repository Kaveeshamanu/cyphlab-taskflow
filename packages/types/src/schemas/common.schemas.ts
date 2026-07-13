import { z } from 'zod'

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc')

export const idParamSchema = z.object({
  id: z.string().cuid(),
})

export type PaginationInput = z.infer<typeof paginationSchema>
