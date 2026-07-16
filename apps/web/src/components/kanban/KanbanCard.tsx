import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CalendarDays } from 'lucide-react'
import type { TaskDto } from '@taskflow/types'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { PriorityBadge } from '@/components/shared/StatusBadges'
import { formatDate, initials, cn } from '@/lib/utils'

interface KanbanCardProps {
  task: TaskDto
  onClick?: () => void
  overlay?: boolean
}

export function KanbanCard({ task, onClick, overlay }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const style = overlay
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      }

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE'

  return (
    <Card
      ref={overlay ? undefined : setNodeRef}
      style={style}
      {...(overlay ? {} : { ...attributes, ...listeners })}
      onClick={onClick}
      className={cn(
        'cursor-pointer touch-none select-none p-3 shadow-sm transition-shadow hover:shadow-md',
        isDragging && 'opacity-40',
        overlay && 'rotate-2 shadow-lg',
      )}
    >
      <CardContent className="space-y-2 p-0">
        <p className="text-sm font-medium leading-snug">{task.title}</p>
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-2 pt-1">
          <PriorityBadge priority={task.priority} />
          {task.assignee && (
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px]">{initials(task.assignee.name)}</AvatarFallback>
            </Avatar>
          )}
        </div>
        {task.dueDate && (
          <div className={cn('flex items-center gap-1 text-xs', isOverdue ? 'text-destructive' : 'text-muted-foreground')}>
            <CalendarDays className="h-3 w-3" />
            {formatDate(task.dueDate)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
