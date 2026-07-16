'use client'

import { useRef, useState } from 'react'
import { Paperclip, Trash2, Upload } from 'lucide-react'
import type { AttachmentDto } from '@taskflow/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAttachments, useDeleteAttachment, useUploadAttachment } from '@/hooks/useAttachments'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function resolveUrl(url: string): string {
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface TaskAttachmentsProps {
  taskId: string
  canDelete: (attachment: AttachmentDto) => boolean
}

export function TaskAttachments({ taskId, canDelete }: TaskAttachmentsProps) {
  const { data: attachments, isLoading } = useAttachments(taskId)
  const upload = useUploadAttachment()
  const deleteAttachment = useDeleteAttachment(taskId)
  const [isDragging, setIsDragging] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    setProgress(0)
    upload.mutate(
      { taskId, file, onProgress: setProgress },
      { onSettled: () => setProgress(null) },
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Attachments</h3>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-6 text-center text-sm text-muted-foreground transition-colors hover:bg-accent/50',
          isDragging && 'border-primary bg-accent/50',
        )}
      >
        <Upload className="h-5 w-5" />
        <span>Drag a file here, or click to browse</span>
        <span className="text-xs">Max 5MB</span>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />
      </div>

      {progress !== null && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Loading attachments…</p>}
      {!isLoading && attachments && attachments.length > 0 && (
        <ul className="space-y-1.5">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-2 text-sm">
              <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
              <a
                href={resolveUrl(a.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate font-medium hover:underline"
              >
                {a.originalName}
              </a>
              <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(a.size)}</span>
              {canDelete(a) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  aria-label={`Delete ${a.originalName}`}
                  onClick={() => deleteAttachment.mutate(a.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
