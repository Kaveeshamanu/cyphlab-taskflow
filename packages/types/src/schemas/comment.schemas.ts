import { z } from 'zod'

export const createCommentSchema = z.object({
  body: z.string().min(1, 'Comment cannot be empty').max(3000),
})

export const listCommentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type CreateCommentInput = z.infer<typeof createCommentSchema>
export type ListCommentsQuery = z.infer<typeof listCommentsQuerySchema>
