import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  ApiResponse,
  CreateUserInput,
  ListUsersQuery,
  PaginatedResponse,
  Role,
  UpdateUserInput,
  UserDto,
} from '@taskflow/types'
import { api, getErrorMessage } from '@/lib/api'

const USERS_KEY = 'users'

export function useUsers(query: Partial<ListUsersQuery>) {
  return useQuery({
    queryKey: [USERS_KEY, query],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<UserDto>>('/users', { params: query })
      return res.data
    },
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateUserInput) => api.post<ApiResponse<UserDto>>('/users', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [USERS_KEY] })
      toast.success('User created')
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Could not create user')),
  })
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateUserInput) => api.patch<ApiResponse<UserDto>>(`/users/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [USERS_KEY] })
      toast.success('User updated')
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Could not update user')),
  })
}

export function useUpdateUserRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) =>
      api.patch<ApiResponse<UserDto>>(`/users/${id}/role`, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [USERS_KEY] })
      toast.success('Role updated')
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Could not update role')),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [USERS_KEY] })
      toast.success('User deleted')
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Could not delete user')),
  })
}
