import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ApiResponse, AttachmentDto } from '@taskflow/types'
import { api, getErrorMessage } from '@/lib/api'

export function useAttachments(taskId: string | undefined) {
  return useQuery({
    queryKey: ['attachments', taskId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<AttachmentDto[]>>(`/tasks/${taskId}/attachments`)
      return res.data.data ?? []
    },
    enabled: !!taskId,
  })
}

interface UploadAttachmentInput {
  taskId: string
  file: File
  onProgress?: (percent: number) => void
}

export function useUploadAttachment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, file, onProgress }: UploadAttachmentInput) => {
      const formData = new FormData()
      formData.append('file', file)
      return api.post<ApiResponse<AttachmentDto>>(`/tasks/${taskId}/attachments`, formData, {
        onUploadProgress: (event) => {
          if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100))
        },
      })
    },
    onSuccess: (_res, { taskId }) => {
      qc.invalidateQueries({ queryKey: ['attachments', taskId] })
      toast.success('File uploaded')
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Upload failed')),
  })
}

export function useDeleteAttachment(taskId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (attachmentId: string) => api.delete(`/attachments/${attachmentId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attachments', taskId] })
      toast.success('Attachment deleted')
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Could not delete attachment')),
  })
}
