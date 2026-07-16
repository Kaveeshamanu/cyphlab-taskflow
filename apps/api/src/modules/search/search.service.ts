import { Role } from '@taskflow/types'
import type { ProjectDto, SearchQuery, TaskDto, UserDto } from '@taskflow/types'
import { prisma } from '../../db/client'
import { toSkipTake } from '../../utils/pagination'
import { toUserDto } from '../../utils/dto'
import * as projectsService from '../projects/projects.service'
import * as tasksService from '../tasks/tasks.service'

type AuthedUser = { id: string; role: Role }

export interface SearchResults {
  projects: ProjectDto[]
  tasks: TaskDto[]
  users: UserDto[]
}

// A single free-text query fanned out across the entities the current role
// is allowed to see at all — reuses each module's own scoping rule rather
// than re-deriving project/task visibility here.
export async function search(user: AuthedUser, query: SearchQuery): Promise<SearchResults> {
  const { take } = toSkipTake(query.page, query.limit)
  const results: SearchResults = { projects: [], tasks: [], users: [] }

  if (!query.type || query.type === 'project') {
    const projects = await prisma.project.findMany({
      where: { ...projectsService.scopeWhere(user), name: { contains: query.q, mode: 'insensitive' } },
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        manager: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true, tasks: true } },
      },
    })
    results.projects = projects.map(projectsService.toProjectDto)
  }

  if (!query.type || query.type === 'task') {
    const tasks = await prisma.task.findMany({
      where: {
        ...tasksService.scopeWhere(user),
        OR: [
          { title: { contains: query.q, mode: 'insensitive' } },
          { description: { contains: query.q, mode: 'insensitive' } },
        ],
      },
      take,
      orderBy: { createdAt: 'desc' },
      include: tasksService.taskInclude,
    })
    results.tasks = tasks.map(tasksService.toTaskDto)
  }

  // User search is admin + PM — a PM needs to find people to add as project
  // members, even though full user CRUD (the /users module) stays admin-only.
  // Team members get no user results: they can't manage membership anyway.
  if ((user.role === Role.ADMIN || user.role === Role.PROJECT_MANAGER) && (!query.type || query.type === 'user')) {
    const users = await prisma.user.findMany({
      where: { OR: [{ name: { contains: query.q, mode: 'insensitive' } }, { email: { contains: query.q, mode: 'insensitive' } }] },
      take,
      orderBy: { createdAt: 'desc' },
    })
    results.users = users.map(toUserDto)
  }

  return results
}
