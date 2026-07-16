'use client'

import { useEffect, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import type { QueryKey } from '@tanstack/react-query'
import { TaskStatus } from '@taskflow/types'
import type { TaskDto } from '@taskflow/types'
import { KanbanColumn } from './KanbanColumn'
import { KanbanCard } from './KanbanCard'
import { useMoveTask } from '@/hooks/useTasks'

const COLUMNS: TaskStatus[] = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW, TaskStatus.DONE]

type ColumnMap = Record<TaskStatus, TaskDto[]>

function groupByStatus(tasks: TaskDto[]): ColumnMap {
  const grouped: ColumnMap = { TODO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [] }
  for (const task of [...tasks].sort((a, b) => a.position - b.position)) {
    grouped[task.status].push(task)
  }
  return grouped
}

function computePosition(prev: number | undefined, next: number | undefined): number {
  if (prev === undefined && next === undefined) return 1000
  if (prev === undefined) return next! - 1000
  if (next === undefined) return prev + 1000
  return (prev + next) / 2
}

interface KanbanBoardProps {
  tasks: TaskDto[]
  queryKey: QueryKey
  onCardClick: (task: TaskDto) => void
}

export function KanbanBoard({ tasks, queryKey, onCardClick }: KanbanBoardProps) {
  const [columns, setColumns] = useState<ColumnMap>(() => groupByStatus(tasks))
  const [activeTask, setActiveTask] = useState<TaskDto | null>(null)
  const moveTask = useMoveTask(queryKey)

  // Resyncs local drag state whenever the underlying query data changes —
  // including the react-query rollback after a failed move, which is what
  // actually reverts a card to its original column on error.
  useEffect(() => {
    setColumns(groupByStatus(tasks))
  }, [tasks])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function findColumnOf(id: string): TaskStatus | undefined {
    return COLUMNS.find((status) => columns[status].some((t) => t.id === id))
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveTask(tasks.find((t) => t.id === event.active.id) ?? null)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    if (activeId === overId) return

    const activeColumn = findColumnOf(activeId)
    const overColumn = (COLUMNS as string[]).includes(overId) ? (overId as TaskStatus) : findColumnOf(overId)
    if (!activeColumn || !overColumn || activeColumn === overColumn) return

    setColumns((prev) => {
      const activeItems = [...prev[activeColumn]]
      const overItems = [...prev[overColumn]]
      const activeIndex = activeItems.findIndex((t) => t.id === activeId)
      if (activeIndex === -1) return prev
      const overIndex = overItems.findIndex((t) => t.id === overId)

      const [moved] = activeItems.splice(activeIndex, 1)
      const insertIndex = overIndex >= 0 ? overIndex : overItems.length
      overItems.splice(insertIndex, 0, { ...moved, status: overColumn })

      return { ...prev, [activeColumn]: activeItems, [overColumn]: overItems }
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTask(null)
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)
    const column = findColumnOf(activeId)
    if (!column) return

    let items = columns[column]
    const activeIndex = items.findIndex((t) => t.id === activeId)
    const overIndex = (COLUMNS as string[]).includes(overId) ? items.length - 1 : items.findIndex((t) => t.id === overId)

    if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
      items = arrayMove(items, activeIndex, overIndex)
      setColumns((prev) => ({ ...prev, [column]: items }))
    }

    const finalIndex = items.findIndex((t) => t.id === activeId)
    const prevTask = items[finalIndex - 1]
    const nextTask = items[finalIndex + 1]
    const newPosition = computePosition(prevTask?.position, nextTask?.position)

    const original = tasks.find((t) => t.id === activeId)
    const statusChanged = original?.status !== column

    moveTask.mutate({
      id: activeId,
      input: { ...(statusChanged ? { status: column } : {}), position: newPosition },
    })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
        {COLUMNS.map((status) => (
          <div key={status} className="w-[85vw] shrink-0 snap-center sm:w-auto">
            <KanbanColumn status={status} tasks={columns[status]} onCardClick={onCardClick} />
          </div>
        ))}
      </div>
      <DragOverlay>{activeTask && <KanbanCard task={activeTask} overlay />}</DragOverlay>
    </DndContext>
  )
}
