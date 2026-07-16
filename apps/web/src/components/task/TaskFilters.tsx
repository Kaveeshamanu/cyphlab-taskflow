import { Search } from 'lucide-react'
import { Priority, TaskStatus } from '@taskflow/types'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface TaskFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  status: TaskStatus | 'all'
  onStatusChange: (value: TaskStatus | 'all') => void
  priority: Priority | 'all'
  onPriorityChange: (value: Priority | 'all') => void
}

export function TaskFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
}: TaskFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search tasks…"
          className="pl-8"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <Select value={status} onValueChange={(v) => onStatusChange(v as TaskStatus | 'all')}>
        <SelectTrigger className="sm:w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {Object.values(TaskStatus).map((s) => (
            <SelectItem key={s} value={s}>
              {s.replace('_', ' ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={priority} onValueChange={(v) => onPriorityChange(v as Priority | 'all')}>
        <SelectTrigger className="sm:w-36">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All priorities</SelectItem>
          {Object.values(Priority).map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
