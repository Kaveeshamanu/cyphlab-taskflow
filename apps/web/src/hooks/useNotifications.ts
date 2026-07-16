import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiResponse, NotificationDto, PaginatedResponse } from '@taskflow/types'
import { api } from '@/lib/api'

const NOTIFICATIONS_KEY = ['notifications'] as const

export function useNotifications() {
  return useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<NotificationDto>>('/notifications', {
        params: { page: 1, limit: 20 },
      })
      return res.data
    },
    refetchInterval: 30_000,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch<ApiResponse<null>>(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.patch<ApiResponse<null>>('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  })
}
