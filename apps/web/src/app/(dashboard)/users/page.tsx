'use client'

import { useState } from 'react'
import { Search, Trash2, Users as UsersIcon } from 'lucide-react'
import { Role } from '@taskflow/types'
import type { UserDto } from '@taskflow/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Pagination } from '@/components/shared/Pagination'
import { RequireRole } from '@/components/shared/RequireRole'
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CreateUserDialog } from '@/components/user/CreateUserDialog'
import { useDeleteUser, useUpdateUserRole, useUsers } from '@/hooks/useUsers'
import { useAuthStore } from '@/stores/authStore'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatDate } from '@/lib/utils'

function UsersPageContent() {
  const currentUser = useAuthStore((s) => s.user)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<Role | 'all'>('all')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search, 300)

  const { data, isLoading, isError, refetch } = useUsers({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    role: role === 'all' ? undefined : role,
  })
  const updateRole = useUpdateUserRole()
  const deleteUser = useDeleteUser()
  const users = data?.data ?? []

  function handleDelete(user: UserDto) {
    if (user.id === currentUser?.id) return
    if (!window.confirm(`Delete ${user.name}? This can be restored later by another admin.`)) return
    deleteUser.mutate(user.id)
  }

  const columns: DataTableColumn<UserDto>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (u) => (
        <div>
          <p className="font-medium">{u.name}</p>
          <p className="text-xs text-muted-foreground">{u.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (u) => (
        <Select
          value={u.role}
          disabled={u.id === currentUser?.id}
          onValueChange={(v) => updateRole.mutate({ id: u.id, role: v as Role })}
        >
          <SelectTrigger className="h-8 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(Role).map((r) => (
              <SelectItem key={r} value={r}>
                {r.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (u) => <span className="text-sm text-muted-foreground">{formatDate(u.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (u) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={u.id === currentUser?.id}
          aria-label={`Delete ${u.name}`}
          onClick={() => handleDelete(u)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Manage accounts and roles." actions={<CreateUserDialog />} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Select
          value={role}
          onValueChange={(v) => {
            setRole(v as Role | 'all')
            setPage(1)
          }}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {Object.values(Role).map((r) => (
              <SelectItem key={r} value={r}>
                {r.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError && <ErrorState onRetry={() => refetch()} />}
      {!isError && !isLoading && users.length === 0 && (
        <EmptyState icon={UsersIcon} title="No users found" description="Try adjusting your search or filters." />
      )}
      {!isError && (isLoading || users.length > 0) && (
        <>
          <DataTable columns={columns} rows={users} getRowId={(u) => u.id} isLoading={isLoading} />
          {data && <Pagination meta={data.meta} onPageChange={setPage} />}
        </>
      )}
    </div>
  )
}

export default function UsersPage() {
  return (
    <RequireRole roles={[Role.ADMIN]}>
      <UsersPageContent />
    </RequireRole>
  )
}
