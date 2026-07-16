'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { FolderKanban, ListChecks, Loader2, Users as UsersIcon } from 'lucide-react'
import { Role, type ApiResponse } from '@taskflow/types'
import type { ProjectDto, TaskDto, UserDto } from '@taskflow/types'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'

interface SearchResults {
  projects: ProjectDto[]
  tasks: TaskDto[]
  users: UserDto[]
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 250)
  const router = useRouter()
  const role = useAuthStore((s) => s.user?.role)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const { data, isFetching } = useQuery({
    queryKey: ['global-search', debouncedQuery],
    queryFn: async () => {
      const res = await api.get<ApiResponse<SearchResults>>('/search', {
        params: { q: debouncedQuery, limit: 5 },
      })
      return res.data.data
    },
    enabled: open && debouncedQuery.trim().length > 0,
  })

  function go(href: string) {
    setOpen(false)
    setQuery('')
    router.push(href)
  }

  const hasQuery = debouncedQuery.trim().length > 0
  const noResults =
    hasQuery && !isFetching && !data?.projects.length && !data?.tasks.length && !data?.users.length

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-64 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent"
      >
        <span className="flex-1 text-left">Search…</span>
        <kbd className="pointer-events-none hidden select-none items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium sm:flex">
          ⌘K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search projects, tasks, people…" value={query} onValueChange={setQuery} />
          <CommandList>
            {!hasQuery && (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                Start typing to search across TaskFlow.
              </p>
            )}
            {isFetching && hasQuery && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching…
              </div>
            )}
            {noResults && <CommandEmpty>No results for &quot;{debouncedQuery}&quot;.</CommandEmpty>}

            {!!data?.projects.length && (
              <CommandGroup heading="Projects">
                {data.projects.map((p) => (
                  <CommandItem key={p.id} value={`project-${p.id}`} onSelect={() => go(`/projects/${p.id}`)}>
                    <FolderKanban className="h-4 w-4" />
                    {p.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {!!data?.tasks.length && (
              <CommandGroup heading="Tasks">
                {data.tasks.map((t) => (
                  <CommandItem key={t.id} value={`task-${t.id}`} onSelect={() => go(`/tasks?task=${t.id}`)}>
                    <ListChecks className="h-4 w-4" />
                    {t.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {(role === Role.ADMIN || role === Role.PROJECT_MANAGER) && !!data?.users.length && (
              <CommandGroup heading="People">
                {data.users.map((u) => (
                  <CommandItem key={u.id} value={`user-${u.id}`} onSelect={() => go('/users')}>
                    <UsersIcon className="h-4 w-4" />
                    {u.name} <span className="text-xs text-muted-foreground">{u.email}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
