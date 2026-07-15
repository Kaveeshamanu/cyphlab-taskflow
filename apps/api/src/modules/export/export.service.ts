import { prisma } from '../../db/client'
import { AppError } from '../../utils/envelope'

const CSV_HEADER = ['ID', 'Title', 'Status', 'Priority', 'Due Date', 'Assignee', 'Tags', 'Created At']

function escapeCsvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

export async function exportProjectTasksCsv(projectId: string): Promise<{ filename: string; csv: string }> {
  const project = await prisma.project.findFirst({ where: { id: projectId }, select: { id: true, name: true } })
  if (!project) throw new AppError('Project not found', 404)

  const tasks = await prisma.task.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
    include: {
      assignee: { select: { name: true } },
      tags: { include: { tag: { select: { name: true } } } },
    },
  })

  const rows = tasks.map((t) => [
    t.id,
    t.title,
    t.status,
    t.priority,
    t.dueDate ? t.dueDate.toISOString() : '',
    t.assignee?.name ?? '',
    t.tags.map((tt) => tt.tag.name).join('; '),
    t.createdAt.toISOString(),
  ])

  const csv = [CSV_HEADER, ...rows].map((row) => row.map((field) => escapeCsvField(String(field))).join(',')).join('\n')
  const filename = `${project.name.replace(/[^a-zA-Z0-9-]+/g, '-')}-tasks.csv`
  return { filename, csv }
}
