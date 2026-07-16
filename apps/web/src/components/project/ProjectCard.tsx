import Link from 'next/link'
import { ListChecks, Users } from 'lucide-react'
import type { ProjectDto } from '@taskflow/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProjectStatusBadge } from '@/components/shared/StatusBadges'

export function ProjectCard({ project }: { project: ProjectDto }) {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="h-full transition-colors hover:border-primary/50 hover:shadow-md">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-1">{project.name}</CardTitle>
            <ProjectStatusBadge status={project.status} />
          </div>
          {project.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
          )}
        </CardHeader>
        <CardContent className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ListChecks className="h-3.5 w-3.5" />
            {project.taskCount ?? 0} tasks
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {project.memberCount ?? 0} members
          </span>
        </CardContent>
      </Card>
    </Link>
  )
}
