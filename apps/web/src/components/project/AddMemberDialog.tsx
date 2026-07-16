'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, UserPlus } from 'lucide-react'
import type { ApiResponse, UserDto } from '@taskflow/types'
import { api } from '@/lib/api'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useAddProjectMember } from '@/hooks/useProjects'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { initials } from '@/lib/utils'

interface AddMemberDialogProps {
  projectId: string
  existingMemberIds: string[]
}

export function AddMemberDialog({ projectId, existingMemberIds }: AddMemberDialogProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 300)
  const addMember = useAddProjectMember(projectId)

  const { data, isFetching } = useQuery({
    queryKey: ['user-search', debouncedQuery],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ users: UserDto[] }>>('/search', {
        params: { q: debouncedQuery, type: 'user', limit: 8 },
      })
      return res.data.data?.users ?? []
    },
    enabled: open && debouncedQuery.trim().length > 0,
  })

  const results = (data ?? []).filter((u) => !existingMemberIds.includes(u.id))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4" />
          Add member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a member</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Search by name or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {isFetching && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          )}
          {!isFetching && query.trim().length > 0 && results.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No matching users.</p>
          )}
          {!isFetching &&
            results.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() =>
                  addMember.mutate(user.id, {
                    onSuccess: () => setQuery(''),
                  })
                }
                disabled={addMember.isPending}
                className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent disabled:opacity-50"
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs">{initials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
              </button>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
