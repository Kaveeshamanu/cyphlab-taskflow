import { Role } from '@taskflow/types'
import type {
  AddProjectMemberInput,
  CreateProjectInput,
  ListProjectsQuery,
  ProjectDto,
  UpdateProjectInput,
} from '@taskflow/types'
import { prisma, prismaUnfiltered } from '../../db/client'
import { AppError } from '../../utils/envelope'
import { buildMeta, toSkipTake } from '../../utils/pagination'
import { logActivity } from '../../utils/activityLog'

type AuthedUser = { id: string; role: Role }

interface ProjectRecord {
  id: string
  name: string
  description: string | null
  status: string
  managerId: string
  createdAt: Date
  updatedAt: Date
  manager?: { id: string; name: string; email: string }
  _count?: { members: number; tasks: number }
  members?: { user: { id: string; name: string; email: string; avatarUrl: string | null } }[]
}

export function toProjectDto(project: ProjectRecord): ProjectDto {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    // Prisma's ProjectStatus enum has identical string values to
    // @taskflow/types' ProjectStatus — value-preserving cast, not a runtime one.
    status: project.status as ProjectDto['status'],
    managerId: project.managerId,
    ...(project.manager ? { manager: project.manager } : {}),
    ...(project._count ? { memberCount: project._count.members, taskCount: project._count.tasks } : {}),
    ...(project.members ? { members: project.members.map((m) => m.user) } : {}),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  }
}

export function scopeWhere(user: AuthedUser) {
  if (user.role === Role.ADMIN) return {}
  if (user.role === Role.PROJECT_MANAGER) return { managerId: user.id }
  return { members: { some: { userId: user.id } } }
}

export async function list(
  user: AuthedUser,
  query: ListProjectsQuery,
): Promise<{ data: ProjectDto[]; total: number }> {
  const { skip, take } = toSkipTake(query.page, query.limit)
  const where = {
    ...scopeWhere(user),
    ...(query.status ? { status: query.status } : {}),
    ...(query.search ? { name: { contains: query.search, mode: 'insensitive' as const } } : {}),
  }

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        manager: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true, tasks: true } },
      },
    }),
    prisma.project.count({ where }),
  ])

  return { data: projects.map(toProjectDto), total }
}

export function paginationMeta(query: ListProjectsQuery, total: number) {
  return buildMeta(query.page, query.limit, total)
}

export async function getById(id: string): Promise<ProjectDto> {
  const project = await prisma.project.findFirst({
    where: { id },
    include: {
      manager: { select: { id: true, name: true, email: true } },
      _count: { select: { members: true, tasks: true } },
      members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
    },
  })
  if (!project) throw new AppError('Project not found', 404)
  return toProjectDto(project)
}

export async function create(user: AuthedUser, input: CreateProjectInput): Promise<ProjectDto> {
  const project = await prisma.project.create({
    data: {
      name: input.name,
      description: input.description,
      status: input.status,
      managerId: user.id,
    },
    include: {
      manager: { select: { id: true, name: true, email: true } },
      _count: { select: { members: true, tasks: true } },
    },
  })
  return toProjectDto(project)
}

export async function update(id: string, input: UpdateProjectInput): Promise<ProjectDto> {
  const existing = await prisma.project.findFirst({ where: { id } })
  if (!existing) throw new AppError('Project not found', 404)

  const project = await prisma.project.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
    include: {
      manager: { select: { id: true, name: true, email: true } },
      _count: { select: { members: true, tasks: true } },
    },
  })
  return toProjectDto(project)
}

export async function softDelete(id: string): Promise<void> {
  const existing = await prisma.project.findFirst({ where: { id } })
  if (!existing) throw new AppError('Project not found', 404)
  await prisma.project.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function restore(id: string): Promise<ProjectDto> {
  const existing = await prismaUnfiltered.project.findUnique({ where: { id } })
  if (!existing) throw new AppError('Project not found', 404)
  if (!existing.deletedAt) throw new AppError('Project is not deleted', 400)

  const project = await prismaUnfiltered.project.update({
    where: { id },
    data: { deletedAt: null },
    include: {
      manager: { select: { id: true, name: true, email: true } },
      _count: { select: { members: true, tasks: true } },
    },
  })
  await logActivity('project', id, 'RESTORED')
  return toProjectDto(project)
}

export async function addMember(projectId: string, input: AddProjectMemberInput): Promise<void> {
  const project = await prisma.project.findFirst({ where: { id: projectId } })
  if (!project) throw new AppError('Project not found', 404)

  const user = await prisma.user.findFirst({ where: { id: input.userId } })
  if (!user) throw new AppError('User not found', 404, [{ field: 'userId', message: 'User not found' }])

  const existingMembership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: input.userId } },
  })
  if (existingMembership) {
    throw new AppError('User is already a member of this project', 409)
  }

  await prisma.projectMember.create({ data: { projectId, userId: input.userId } })
  await logActivity('project', projectId, 'MEMBER_ADDED', { userId: input.userId })
}

export async function removeMember(projectId: string, userId: string): Promise<void> {
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  })
  if (!membership) throw new AppError('User is not a member of this project', 404)

  await prisma.projectMember.delete({ where: { projectId_userId: { projectId, userId } } })
  await logActivity('project', projectId, 'MEMBER_REMOVED', { userId })
}
