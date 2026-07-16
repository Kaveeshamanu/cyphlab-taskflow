import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  ApiResponse,
  CreateProjectInput,
  ListProjectsQuery,
  PaginatedResponse,
  ProjectDto,
  UpdateProjectInput,
} from '@taskflow/types'
import { api, getErrorMessage } from '@/lib/api'

const PROJECTS_KEY = 'projects'

export function useProjects(query: Partial<ListProjectsQuery>) {
  return useQuery({
    queryKey: [PROJECTS_KEY, 'list', query],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<ProjectDto>>('/projects', { params: query })
      return res.data
    },
  })
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: [PROJECTS_KEY, 'detail', id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ProjectDto>>(`/projects/${id}`)
      return res.data.data as ProjectDto
    },
    enabled: !!id,
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateProjectInput) => api.post<ApiResponse<ProjectDto>>('/projects', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PROJECTS_KEY] })
      toast.success('Project created')
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Could not create project')),
  })
}

export function useUpdateProject(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateProjectInput) => api.patch<ApiResponse<ProjectDto>>(`/projects/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PROJECTS_KEY] })
      toast.success('Project updated')
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Could not update project')),
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PROJECTS_KEY] })
      toast.success('Project deleted')
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Could not delete project')),
  })
}

export function useAddProjectMember(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => api.post(`/projects/${projectId}/members`, { userId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PROJECTS_KEY, 'detail', projectId] })
      toast.success('Member added')
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Could not add member')),
  })
}

export function useRemoveProjectMember(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => api.delete(`/projects/${projectId}/members/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PROJECTS_KEY, 'detail', projectId] })
      toast.success('Member removed')
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Could not remove member')),
  })
}
