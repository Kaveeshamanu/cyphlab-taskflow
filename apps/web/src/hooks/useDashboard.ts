import { useQuery } from '@tanstack/react-query'
import type { ApiResponse, DashboardData } from '@taskflow/types'
import { api } from '@/lib/api'

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<DashboardData>>('/dashboard')
      return res.data.data as DashboardData
    },
  })
}
