import { useQuery } from '@tanstack/react-query'
import type { ActivityLogDto, ListActivityQuery, PaginatedResponse } from '@taskflow/types'
import { api } from '@/lib/api'

export function useActivity(query: Partial<ListActivityQuery>) {
  return useQuery({
    queryKey: ['activity', query],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<ActivityLogDto>>('/activity', { params: query })
      return res.data
    },
  })
}
