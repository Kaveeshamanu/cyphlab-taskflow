'use client'

import { useState } from 'react'
import { FolderKanban } from 'lucide-react'
import { ProjectStatus, Role } from '@taskflow/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { SkeletonCardGrid } from '@/components/shared/SkeletonCard'
import { Pagination } from '@/components/shared/Pagination'
import { ProjectCard } from '@/components/project/ProjectCard'
import { ProjectFilters } from '@/components/project/ProjectFilters'
import { CreateProjectDialog } from '@/components/project/CreateProjectDialog'
import { useProjects } from '@/hooks/useProjects'
import { useAuthStore } from '@/stores/authStore'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

export default function ProjectsPage() {
  const role = useAuthStore((s) => s.user?.role)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ProjectStatus | 'all'>('all')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search, 300)

  const { data, isLoading, isError, refetch } = useProjects({
    page,
    limit: 12,
    search: debouncedSearch || undefined,
    status: status === 'all' ? undefined : status,
  })

  const canCreate = role === Role.ADMIN || role === Role.PROJECT_MANAGER

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Every project you manage or belong to."
        actions={canCreate ? <CreateProjectDialog /> : undefined}
      />

      <ProjectFilters
        search={search}
        onSearchChange={(v) => {
          setSearch(v)
          setPage(1)
        }}
        status={status}
        onStatusChange={(v) => {
          setStatus(v)
          setPage(1)
        }}
      />

      {isLoading && <SkeletonCardGrid count={6} />}
      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && data && (
        <>
          {(data.data ?? []).length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No projects found"
              description={
                search || status !== 'all'
                  ? 'Try adjusting your search or filters.'
                  : canCreate
                    ? 'Create your first project to get started.'
                    : "You haven't been added to any projects yet."
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(data.data ?? []).map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
              <Pagination meta={data.meta} onPageChange={setPage} />
            </>
          )}
        </>
      )}
    </div>
  )
}
