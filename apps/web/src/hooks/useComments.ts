import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ApiResponse, CommentDto, CreateCommentInput, PaginatedResponse } from '@taskflow/types'
import { api, getErrorMessage } from '@/lib/api'

export function useComments(taskId: string | undefined) {
  return useQuery({
    queryKey: ['comments', taskId],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<CommentDto>>(`/tasks/${taskId}/comments`, {
        params: { limit: 100 },
      })
      return res.data.data ?? []
    },
    enabled: !!taskId,
  })
}

export function useCreateComment(taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCommentInput) => api.post<ApiResponse<CommentDto>>(`/tasks/${taskId}/comments`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', taskId] }),
    onError: (err) => toast.error(getErrorMessage(err, 'Could not add comment')),
  })
}
