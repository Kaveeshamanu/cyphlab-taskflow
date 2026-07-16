import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  ApiResponse,
  CreateTaskInput,
  ListTasksQuery,
  MoveTaskInput,
  PaginatedResponse,
  TaskDto,
  UpdateTaskInput,
} from '@taskflow/types'
import { api, getErrorMessage } from '@/lib/api'

const TASKS_KEY = 'tasks'

export function tasksQueryKey(query: Partial<ListTasksQuery>): QueryKey {
  return [TASKS_KEY, 'list', query]
}

export function useTasks(query: Partial<ListTasksQuery>) {
  return useQuery({
    queryKey: tasksQueryKey(query),
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<TaskDto>>('/tasks', { params: query })
      return res.data
    },
  })
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: [TASKS_KEY, 'detail', id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<TaskDto>>(`/tasks/${id}`)
      return res.data.data as TaskDto
    },
    enabled: !!id,
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTaskInput) => api.post<ApiResponse<TaskDto>>('/tasks', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TASKS_KEY] })
      toast.success('Task created')
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Could not create task')),
  })
}

export function useUpdateTask(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateTaskInput) => api.patch<ApiResponse<TaskDto>>(`/tasks/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TASKS_KEY] })
      toast.success('Task updated')
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Could not update task')),
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TASKS_KEY] })
      toast.success('Task deleted')
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Could not delete task')),
  })
}

// Optimistic + rollback: the Kanban drag interaction must feel instant, but
// a failed request (permission change mid-drag, network blip) has to put
// the card back exactly where it was — not just refetch and hope.
export function useMoveTask(queryKey: QueryKey) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: MoveTaskInput }) =>
      api.patch<ApiResponse<TaskDto>>(`/tasks/${id}/move`, input),
    onMutate: async ({ id, input }) => {
      await qc.cancelQueries({ queryKey })
      const previous = qc.getQueryData<PaginatedResponse<TaskDto>>(queryKey)
      if (previous) {
        qc.setQueryData<PaginatedResponse<TaskDto>>(queryKey, {
          ...previous,
          data: (previous.data ?? []).map((t) => (t.id === id ? { ...t, ...input } : t)),
        })
      }
      return { previous }
    },
    onError: (err, _vars, context) => {
      if (context?.previous) qc.setQueryData(queryKey, context.previous)
      toast.error(getErrorMessage(err, 'Could not move task'))
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  })
}
