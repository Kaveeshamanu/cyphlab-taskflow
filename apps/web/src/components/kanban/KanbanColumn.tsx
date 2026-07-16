import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { TaskStatus } from '@taskflow/types'
import type { TaskDto } from '@taskflow/types'
import { KanbanCard } from './KanbanCard'
import { cn } from '@/lib/utils'

const COLUMN_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: 'To Do',
  [TaskStatus.IN_PROGRESS]: 'In Progress',
  [TaskStatus.IN_REVIEW]: 'In Review',
  [TaskStatus.DONE]: 'Done',
}

interface KanbanColumnProps {
  status: TaskStatus
  tasks: TaskDto[]
  onCardClick: (task: TaskDto) => void
}

export function KanbanColumn({ status, tasks, onCardClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="flex flex-col rounded-lg border border-border bg-muted/30">
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <p className="text-sm font-semibold">{COLUMN_LABELS[status]}</p>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {tasks.length}
        </span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'flex min-h-32 flex-1 flex-col gap-2 p-2 transition-colors',
            isOver && 'bg-accent/50',
          )}
        >
          {tasks.length === 0 && (
            <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border py-8 text-xs text-muted-foreground">
              Drop tasks here
            </div>
          )}
          {tasks.map((task) => (
            <KanbanCard key={task.id} task={task} onClick={() => onCardClick(task)} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
