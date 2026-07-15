import { Priority, ProjectStatus, Role, TaskStatus } from './enums'
import { ActivityLogDto, NotificationDto } from './entities.types'

export interface AdminDashboardData {
  role: Role.ADMIN
  usersByRole: Record<Role, number>
  projectsByStatus: Record<ProjectStatus, number>
  tasksTimeline: { date: string; created: number; completed: number }[]
  recentActivity: ActivityLogDto[]
  systemStats: { totalUsers: number; totalProjects: number; totalTasks: number }
}

export interface PMDashboardData {
  role: Role.PROJECT_MANAGER
  projectHealth: { id: string; name: string; status: ProjectStatus; taskCount: number; overdueCount: number }[]
  tasksByStatus: Record<TaskStatus, number>
  overdueCount: number
  teamWorkload: { userId: string; name: string; taskCount: number }[]
  upcomingDeadlines: { id: string; title: string; dueDate: string; projectId: string }[]
}

export interface MemberDashboardData {
  role: Role.TEAM_MEMBER
  openTasksByPriority: Record<Priority, number>
  dueThisWeek: { id: string; title: string; dueDate: string; projectId: string }[]
  completionRate: { date: string; completed: number }[]
  recentNotifications: NotificationDto[]
}

export type DashboardData = AdminDashboardData | PMDashboardData | MemberDashboardData
