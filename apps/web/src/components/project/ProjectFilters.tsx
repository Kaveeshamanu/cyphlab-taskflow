import { Search } from 'lucide-react'
import { ProjectStatus } from '@taskflow/types'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ProjectFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  status: ProjectStatus | 'all'
  onStatusChange: (value: ProjectStatus | 'all') => void
}

export function ProjectFilters({ search, onSearchChange, status, onStatusChange }: ProjectFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search projects…"
          className="pl-8"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <Select value={status} onValueChange={(v) => onStatusChange(v as ProjectStatus | 'all')}>
        <SelectTrigger className="sm:w-44">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {Object.values(ProjectStatus).map((s) => (
            <SelectItem key={s} value={s}>
              {s.replace('_', ' ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
