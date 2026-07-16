import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SkeletonRows } from '@/components/shared/SkeletonCard'
import { cn } from '@/lib/utils'

export interface DataTableColumn<T> {
  key: string
  header: string
  sortable?: boolean
  className?: string
  render: (row: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  getRowId: (row: T) => string
  sort?: { key: string; order: 'asc' | 'desc' }
  onSortChange?: (key: string) => void
  onRowClick?: (row: T) => void
  isLoading?: boolean
}

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  sort,
  onSortChange,
  onRowClick,
  isLoading,
}: DataTableProps<T>) {
  if (isLoading) {
    return <SkeletonRows rows={6} cols={columns.length} />
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) => {
            const isActive = sort?.key === col.key
            return (
              <TableHead key={col.key} className={col.className}>
                {col.sortable ? (
                  <button
                    type="button"
                    onClick={() => onSortChange?.(col.key)}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    {col.header}
                    {isActive ? (
                      sort?.order === 'asc' ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40" />
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </TableHead>
            )
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={getRowId(row)}
            onClick={() => onRowClick?.(row)}
            className={cn(onRowClick && 'cursor-pointer')}
          >
            {columns.map((col) => (
              <TableCell key={col.key} className={col.className}>
                {col.render(row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
