import type { TaskDto } from '@taskflow/types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable'
import { TaskStatusBadge, PriorityBadge } from '@/components/shared/StatusBadges'
import { formatDate, initials, cn } from '@/lib/utils'

interface TaskTableProps {
  tasks: TaskDto[]
  sort: { key: string; order: 'asc' | 'desc' }
  onSortChange: (key: string) => void
  onRowClick: (task: TaskDto) => void
  isLoading?: boolean
}

export function TaskTable({ tasks, sort, onSortChange, onRowClick, isLoading }: TaskTableProps) {
  const columns: DataTableColumn<TaskDto>[] = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (t) => <span className="font-medium">{t.title}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => <TaskStatusBadge status={t.status} />,
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      render: (t) => <PriorityBadge priority={t.priority} />,
    },
    {
      key: 'assignee',
      header: 'Assignee',
      render: (t) =>
        t.assignee ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px]">{initials(t.assignee.name)}</AvatarFallback>
            </Avatar>
            <span className="text-sm">{t.assignee.name}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Unassigned</span>
        ),
    },
    {
      key: 'dueDate',
      header: 'Due date',
      sortable: true,
      render: (t) => {
        const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE'
        return <span className={cn('text-sm', isOverdue && 'font-medium text-destructive')}>{formatDate(t.dueDate)}</span>
      },
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={tasks}
      getRowId={(t) => t.id}
      sort={sort}
      onSortChange={onSortChange}
      onRowClick={onRowClick}
      isLoading={isLoading}
    />
  )
}
