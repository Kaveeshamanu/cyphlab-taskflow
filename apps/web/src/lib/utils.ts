import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isValid } from 'date-fns'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const date = typeof value === 'string' ? new Date(value) : value
  return isValid(date) ? date : null
}

export function formatDate(value: string | Date | null | undefined, pattern = 'MMM d, yyyy'): string {
  const date = toDate(value)
  return date ? format(date, pattern) : '—'
}

export function formatDateTime(value: string | Date | null | undefined): string {
  return formatDate(value, 'MMM d, yyyy h:mm a')
}

export function relativeTime(value: string | Date | null | undefined): string {
  const date = toDate(value)
  return date ? formatDistanceToNow(date, { addSuffix: true }) : '—'
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}
