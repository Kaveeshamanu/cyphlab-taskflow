import { randomUUID } from 'node:crypto'
import { hash } from '@node-rs/argon2'
import { Role, TaskStatus, Priority, ProjectStatus } from '@taskflow/types'
import { prisma } from '../../src/db/client'
import { signAccessToken } from '../../src/utils/jwt'

export function uniqueEmail(prefix = 'test'): string {
  return `${prefix}-${randomUUID()}@example.com`
}

interface CreateUserOverrides {
  name?: string
  email?: string
  role?: Role
}

export async function createUser(overrides: CreateUserOverrides = {}) {
  const passwordHash = await hash('Password123')
  return prisma.user.create({
    data: {
      name: overrides.name ?? 'Test User',
      email: overrides.email ?? uniqueEmail('user'),
      passwordHash,
      role: overrides.role ?? Role.TEAM_MEMBER,
      isEmailVerified: true,
    },
  })
}

export function tokenFor(userId: string, role: Role): string {
  return signAccessToken({ sub: userId, role }).token
}

export function authHeader(userId: string, role: Role): string {
  return `Bearer ${tokenFor(userId, role)}`
}

interface CreateProjectOverrides {
  name?: string
  status?: ProjectStatus
}

export async function createProject(managerId: string, overrides: CreateProjectOverrides = {}) {
  return prisma.project.create({
    data: {
      name: overrides.name ?? `Test Project ${randomUUID()}`,
      status: overrides.status ?? ProjectStatus.ACTIVE,
      managerId,
    },
  })
}

export async function addProjectMember(projectId: string, userId: string) {
  return prisma.projectMember.create({ data: { projectId, userId } })
}

interface CreateTaskOverrides {
  title?: string
  status?: TaskStatus
  priority?: Priority
  assigneeId?: string | null
  position?: number
}

export async function createTask(projectId: string, overrides: CreateTaskOverrides = {}) {
  return prisma.task.create({
    data: {
      title: overrides.title ?? `Test Task ${randomUUID()}`,
      status: overrides.status ?? TaskStatus.TODO,
      priority: overrides.priority ?? Priority.MEDIUM,
      assigneeId: overrides.assigneeId,
      position: overrides.position ?? 1000,
      projectId,
    },
  })
}
