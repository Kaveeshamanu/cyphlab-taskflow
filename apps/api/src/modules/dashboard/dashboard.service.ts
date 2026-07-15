import { NotifType, Priority, ProjectStatus, Role, TaskStatus } from '@taskflow/types'
import type { AdminDashboardData, DashboardData, MemberDashboardData, PMDashboardData } from '@taskflow/types'
import { prisma, prismaUnfiltered } from '../../db/client'

type AuthedUser = { id: string; role: Role }

const DAY_MS = 86_400_000
const THIRTY_DAYS_AGO = () => new Date(Date.now() - 29 * DAY_MS)
const SEVEN_DAYS_FROM_NOW = () => new Date(Date.now() + 7 * DAY_MS)

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// Fixed 30-day window of date keys so every day appears in the timeline
// even if no tasks were created/completed that day (a bare COUNT...GROUP BY
// would silently omit empty days).
function last30Days(): string[] {
  const days: string[] = []
  const now = new Date()
  for (let i = 29; i >= 0; i--) days.push(dateKey(new Date(now.getTime() - i * DAY_MS)))
  return days
}

function bucketByDay(dates: Date[], days: string[]): Map<string, number> {
  const map = new Map(days.map((d) => [d, 0]))
  for (const date of dates) {
    const key = dateKey(date)
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1)
  }
  return map
}

async function buildAdminDashboard(): Promise<AdminDashboardData> {
  const thirtyDaysAgo = THIRTY_DAYS_AGO()

  const [usersByRoleRaw, projectsByStatusRaw, totalUsers, totalProjects, totalTasks, recentLogs, createdTasks, completedTasks] =
    await Promise.all([
      prisma.user.groupBy({ by: ['role'], _count: true }),
      prisma.project.groupBy({ by: ['status'], _count: true }),
      prisma.user.count(),
      prisma.project.count(),
      prisma.task.count(),
      prismaUnfiltered.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { id: true, name: true } } },
      }),
      prisma.task.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true } }),
      prisma.task.findMany({
        where: { status: TaskStatus.DONE, updatedAt: { gte: thirtyDaysAgo } },
        select: { updatedAt: true },
      }),
    ])

  const usersByRole: Record<Role, number> = { ADMIN: 0, PROJECT_MANAGER: 0, TEAM_MEMBER: 0 } as Record<Role, number>
  usersByRoleRaw.forEach((r) => {
    usersByRole[r.role as Role] = r._count
  })

  const projectsByStatus: Record<ProjectStatus, number> = {
    PLANNING: 0,
    ACTIVE: 0,
    ON_HOLD: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  } as Record<ProjectStatus, number>
  projectsByStatusRaw.forEach((r) => {
    projectsByStatus[r.status as ProjectStatus] = r._count
  })

  const days = last30Days()
  const createdByDay = bucketByDay(
    createdTasks.map((t) => t.createdAt),
    days,
  )
  const completedByDay = bucketByDay(
    completedTasks.map((t) => t.updatedAt),
    days,
  )
  const tasksTimeline = days.map((d) => ({
    date: d,
    created: createdByDay.get(d) ?? 0,
    completed: completedByDay.get(d) ?? 0,
  }))

  const recentActivity = recentLogs.map((l) => ({
    id: l.id,
    entityType: l.entityType,
    entityId: l.entityId,
    action: l.action,
    actorId: l.actorId,
    actor: l.actor,
    metadata: l.metadata,
    createdAt: l.createdAt.toISOString(),
  }))

  return {
    role: Role.ADMIN,
    usersByRole,
    projectsByStatus,
    tasksTimeline,
    recentActivity,
    systemStats: { totalUsers, totalProjects, totalTasks },
  }
}

async function buildPMDashboard(user: AuthedUser): Promise<PMDashboardData> {
  const projects = await prisma.project.findMany({
    where: { managerId: user.id },
    select: { id: true, name: true, status: true },
  })
  const projectIds = projects.map((p) => p.id)

  const [taskCounts, overdueCounts, tasksByStatusRaw, workloadRaw, upcoming] = await Promise.all([
    prisma.task.groupBy({ by: ['projectId'], where: { projectId: { in: projectIds } }, _count: true }),
    prisma.task.groupBy({
      by: ['projectId'],
      where: { projectId: { in: projectIds }, dueDate: { lt: new Date() }, status: { not: TaskStatus.DONE } },
      _count: true,
    }),
    prisma.task.groupBy({ by: ['status'], where: { projectId: { in: projectIds } }, _count: true }),
    prisma.task.groupBy({
      by: ['assigneeId'],
      where: { projectId: { in: projectIds }, assigneeId: { not: null } },
      _count: true,
    }),
    prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
        dueDate: { gte: new Date(), lte: SEVEN_DAYS_FROM_NOW() },
        status: { not: TaskStatus.DONE },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
      select: { id: true, title: true, dueDate: true, projectId: true },
    }),
  ])

  const taskCountMap = new Map(taskCounts.map((t) => [t.projectId, t._count]))
  const overdueCountMap = new Map(overdueCounts.map((t) => [t.projectId, t._count]))
  const projectHealth = projects.map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status as ProjectStatus,
    taskCount: taskCountMap.get(p.id) ?? 0,
    overdueCount: overdueCountMap.get(p.id) ?? 0,
  }))

  const tasksByStatus: Record<TaskStatus, number> = {
    TODO: 0,
    IN_PROGRESS: 0,
    IN_REVIEW: 0,
    DONE: 0,
  } as Record<TaskStatus, number>
  tasksByStatusRaw.forEach((r) => {
    tasksByStatus[r.status as TaskStatus] = r._count
  })

  const overdueCount = overdueCounts.reduce((sum, r) => sum + r._count, 0)

  const assigneeIds = workloadRaw.map((w) => w.assigneeId).filter((id): id is string => Boolean(id))
  const assigneeUsers = await prisma.user.findMany({ where: { id: { in: assigneeIds } }, select: { id: true, name: true } })
  const nameMap = new Map(assigneeUsers.map((u) => [u.id, u.name]))
  const teamWorkload = workloadRaw
    .filter((w) => w.assigneeId)
    .map((w) => ({
      userId: w.assigneeId as string,
      name: nameMap.get(w.assigneeId as string) ?? 'Unknown',
      taskCount: w._count,
    }))

  const upcomingDeadlines = upcoming.map((t) => ({
    id: t.id,
    title: t.title,
    dueDate: t.dueDate!.toISOString(),
    projectId: t.projectId,
  }))

  return { role: Role.PROJECT_MANAGER, projectHealth, tasksByStatus, overdueCount, teamWorkload, upcomingDeadlines }
}

async function buildMemberDashboard(user: AuthedUser): Promise<MemberDashboardData> {
  const thirtyDaysAgo = THIRTY_DAYS_AGO()

  const [openByPriorityRaw, dueThisWeek, completedTasks, recentNotifs] = await Promise.all([
    prisma.task.groupBy({
      by: ['priority'],
      where: { assigneeId: user.id, status: { not: TaskStatus.DONE } },
      _count: true,
    }),
    prisma.task.findMany({
      where: {
        assigneeId: user.id,
        status: { not: TaskStatus.DONE },
        dueDate: { gte: new Date(), lte: SEVEN_DAYS_FROM_NOW() },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
      select: { id: true, title: true, dueDate: true, projectId: true },
    }),
    prisma.task.findMany({
      where: { assigneeId: user.id, status: TaskStatus.DONE, updatedAt: { gte: thirtyDaysAgo } },
      select: { updatedAt: true },
    }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { actor: { select: { id: true, name: true, avatarUrl: true } } },
    }),
  ])

  const openTasksByPriority: Record<Priority, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    URGENT: 0,
  } as Record<Priority, number>
  openByPriorityRaw.forEach((r) => {
    openTasksByPriority[r.priority as Priority] = r._count
  })

  const days = last30Days()
  const completedByDay = bucketByDay(
    completedTasks.map((t) => t.updatedAt),
    days,
  )
  const completionRate = days.map((d) => ({ date: d, completed: completedByDay.get(d) ?? 0 }))

  const recentNotifications = recentNotifs.map((n) => ({
    id: n.id,
    type: n.type as NotifType,
    userId: n.userId,
    actorId: n.actorId,
    actor: n.actor,
    entityType: n.entityType,
    entityId: n.entityId,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  }))

  return {
    role: Role.TEAM_MEMBER,
    openTasksByPriority,
    dueThisWeek: dueThisWeek.map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate!.toISOString(),
      projectId: t.projectId,
    })),
    completionRate,
    recentNotifications,
  }
}

export async function getDashboard(user: AuthedUser): Promise<DashboardData> {
  if (user.role === Role.ADMIN) return buildAdminDashboard()
  if (user.role === Role.PROJECT_MANAGER) return buildPMDashboard(user)
  return buildMemberDashboard(user)
}
