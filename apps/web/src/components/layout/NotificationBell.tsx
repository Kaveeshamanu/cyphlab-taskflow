'use client'

import Link from 'next/link'
import { Bell, CheckCheck } from 'lucide-react'
import { NotifType, type NotificationDto } from '@taskflow/types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { EmptyState } from '@/components/shared/EmptyState'
import { relativeTime, cn } from '@/lib/utils'
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/hooks/useNotifications'

function notificationText(n: NotificationDto): string {
  const actor = n.actor?.name ?? 'Someone'
  switch (n.type) {
    case NotifType.TASK_ASSIGNED:
      return `${actor} assigned you a task`
    case NotifType.MENTION:
      return `${actor} mentioned you in a comment`
    case NotifType.COMMENT_ON_TASK:
      return `${actor} commented on your task`
    case NotifType.STATUS_CHANGED:
      return `${actor} changed the status of your task`
    default:
      return 'You have a new notification'
  }
}

function notificationHref(n: NotificationDto): string {
  if (n.entityType === 'task') return `/tasks?task=${n.entityId}`
  if (n.entityType === 'comment') return '/tasks'
  return '/dashboard'
}

export function NotificationBell() {
  const { data, isLoading } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const notifications = data?.data ?? []
  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4.5 w-4.5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>
        <Separator />
        <div className="max-h-96 overflow-y-auto">
          {isLoading && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}
          {!isLoading && notifications.length === 0 && (
            <EmptyState
              icon={Bell}
              title="No notifications yet"
              description="Assignments, mentions, and comments will show up here."
              className="border-none py-8"
            />
          )}
          {!isLoading &&
            notifications.map((n) => (
              <Link
                key={n.id}
                href={notificationHref(n)}
                onClick={() => !n.isRead && markRead.mutate(n.id)}
                className={cn(
                  'block border-b border-border px-3 py-2.5 text-sm transition-colors last:border-0 hover:bg-accent',
                  !n.isRead && 'bg-accent/40',
                )}
              >
                <p className={cn('leading-snug', !n.isRead && 'font-medium')}>{notificationText(n)}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{relativeTime(n.createdAt)}</p>
              </Link>
            ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
