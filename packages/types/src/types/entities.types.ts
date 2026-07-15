import { NotifType, Priority, ProjectStatus, Role, TaskStatus } from './enums'

export interface UserDto {
  id: string
  name: string
  email: string
  role: Role
  avatarUrl: string | null
  isEmailVerified: boolean
  createdAt: string
}

export interface ProjectDto {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  managerId: string
  manager?: Pick<UserDto, 'id' | 'name' | 'email'>
  memberCount?: number
  taskCount?: number
  createdAt: string
  updatedAt: string
}

export interface TagDto {
  id: string
  name: string
  color: string
}

export interface TaskDto {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: Priority
  dueDate: string | null
  position: number
  projectId: string
  assigneeId: string | null
  assignee?: Pick<UserDto, 'id' | 'name' | 'email' | 'avatarUrl'> | null
  parentTaskId: string | null
  tags?: TagDto[]
  createdAt: string
  updatedAt: string
}

export interface CommentDto {
  id: string
  body: string
  taskId: string
  authorId: string
  author?: Pick<UserDto, 'id' | 'name' | 'avatarUrl'>
  mentionedUserIds: string[]
  createdAt: string
  updatedAt: string
}

export interface AttachmentDto {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  taskId: string
  uploaderId: string
  url: string
  createdAt: string
}

export interface NotificationDto {
  id: string
  type: NotifType
  userId: string
  actorId: string
  actor?: Pick<UserDto, 'id' | 'name' | 'avatarUrl'>
  entityType: string
  entityId: string
  isRead: boolean
  createdAt: string
}

export interface ActivityLogDto {
  id: string
  entityType: string
  entityId: string
  action: string
  actorId: string
  actor?: Pick<UserDto, 'id' | 'name'>
  metadata: unknown
  createdAt: string
}
