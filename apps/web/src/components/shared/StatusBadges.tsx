import { Priority, ProjectStatus, TaskStatus } from '@taskflow/types'
import { Badge, type BadgeProps } from '@/components/ui/badge'

const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; variant: BadgeProps['variant'] }> = {
  [TaskStatus.TODO]: { label: 'To Do', variant: 'secondary' },
  [TaskStatus.IN_PROGRESS]: { label: 'In Progress', variant: 'default' },
  [TaskStatus.IN_REVIEW]: { label: 'In Review', variant: 'warning' },
  [TaskStatus.DONE]: { label: 'Done', variant: 'success' },
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const config = TASK_STATUS_CONFIG[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

const PRIORITY_CONFIG: Record<Priority, { label: string; variant: BadgeProps['variant'] }> = {
  [Priority.LOW]: { label: 'Low', variant: 'outline' },
  [Priority.MEDIUM]: { label: 'Medium', variant: 'secondary' },
  [Priority.HIGH]: { label: 'High', variant: 'warning' },
  [Priority.URGENT]: { label: 'Urgent', variant: 'destructive' },
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const config = PRIORITY_CONFIG[priority]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; variant: BadgeProps['variant'] }> = {
  [ProjectStatus.PLANNING]: { label: 'Planning', variant: 'outline' },
  [ProjectStatus.ACTIVE]: { label: 'Active', variant: 'success' },
  [ProjectStatus.ON_HOLD]: { label: 'On Hold', variant: 'warning' },
  [ProjectStatus.COMPLETED]: { label: 'Completed', variant: 'secondary' },
  [ProjectStatus.CANCELLED]: { label: 'Cancelled', variant: 'destructive' },
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const config = PROJECT_STATUS_CONFIG[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
