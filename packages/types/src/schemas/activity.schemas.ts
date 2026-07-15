import { z } from 'zod'

export const listActivityQuerySchema = z.object({
  entityType: z.string().optional(),
  actorId: z.string().cuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type ListActivityQuery = z.infer<typeof listActivityQuerySchema>
