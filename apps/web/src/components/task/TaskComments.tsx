'use client'

import { useMemo, useState } from 'react'
import { Send } from 'lucide-react'
import type { UserDto } from '@taskflow/types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/shared/EmptyState'
import { relativeTime, initials } from '@/lib/utils'
import { useComments, useCreateComment } from '@/hooks/useComments'

interface TaskCommentsProps {
  taskId: string
  members: Pick<UserDto, 'id' | 'name'>[]
}

// @mention autocomplete only triggers when the trailing text is "@partial"
// at the very end of the field — a deliberately simple heuristic (not full
// cursor-position tracking) that covers the common case of typing a mention
// as you go, without the complexity of mid-text caret math.
const TRAILING_MENTION = /@(\w*)$/

export function TaskComments({ taskId, members }: TaskCommentsProps) {
  const { data: comments, isLoading } = useComments(taskId)
  const createComment = useCreateComment(taskId)
  const [body, setBody] = useState('')

  const mentionMatch = body.match(TRAILING_MENTION)
  const mentionQuery = mentionMatch?.[1]?.toLowerCase()
  const suggestions = useMemo(() => {
    if (mentionQuery === undefined) return []
    return members
      .filter((m) => m.name.split(' ')[0].toLowerCase().startsWith(mentionQuery))
      .slice(0, 5)
  }, [members, mentionQuery])

  function insertMention(name: string) {
    const firstName = name.split(' ')[0]
    setBody((prev) => prev.replace(TRAILING_MENTION, `@${firstName} `))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed) return
    createComment.mutate(
      { body: trimmed },
      {
        onSuccess: () => setBody(''),
      },
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Comments</h3>

      {isLoading && <p className="text-sm text-muted-foreground">Loading comments…</p>}
      {!isLoading && comments && comments.length === 0 && (
        <EmptyState title="No comments yet" description="Be the first to comment." className="border-none py-6" />
      )}
      {!isLoading && comments && comments.length > 0 && (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="text-xs">{initials(comment.author?.name ?? '?')}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 rounded-md bg-muted/50 px-3 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">{comment.author?.name ?? 'Unknown'}</p>
                  <p className="shrink-0 text-xs text-muted-foreground">{relativeTime(comment.createdAt)}</p>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm">{comment.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="relative space-y-2">
        {suggestions.length > 0 && (
          <div className="absolute bottom-full z-10 mb-1 w-56 rounded-md border border-border bg-popover p-1 shadow-md">
            {suggestions.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => insertMention(m.name)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                {m.name}
              </button>
            ))}
          </div>
        )}
        <Textarea
          placeholder="Add a comment… use @name to mention someone"
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" loading={createComment.isPending} disabled={!body.trim()}>
            <Send className="h-3.5 w-3.5" />
            Comment
          </Button>
        </div>
      </form>
    </div>
  )
}
